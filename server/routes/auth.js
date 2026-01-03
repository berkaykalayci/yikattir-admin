const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { getCoordinatesFromAddress } = require('../services/geocoding');

const router = express.Router();
const prisma = new PrismaClient();

// Kullanıcı kayıt
router.post('/register', async (req, res) => {
  const { name, email, phone, password, city, district, address, tcNo, vergiNo, role = 'CUSTOMER', ownerName, businessName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
  }

  try {
    // E-posta kontrolü
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
    }

    // Telefon kontrolü (varsa)
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return res.status(400).json({ error: 'Bu telefon numarası zaten kullanılıyor.' });
      }
    }

    // TC Kimlik No kontrolü (varsa ve BUSINESS rolünde)
    if (tcNo && role === 'BUSINESS') {
      const existingTCNo = await prisma.business.findUnique({ where: { tcNo } });
      if (existingTCNo) {
        return res.status(400).json({ error: 'Bu T.C. Kimlik No zaten kullanılıyor.' });
      }
    }

    // Vergi No kontrolü (varsa ve BUSINESS rolünde)
    if (vergiNo && role === 'BUSINESS') {
      const existingVergiNo = await prisma.business.findUnique({ where: { vergiNo } });
      if (existingVergiNo) {
        return res.status(400).json({ error: 'Bu Vergi No zaten kullanılıyor.' });
      }
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı oluştur
    // BUSINESS rolü için ownerName kullan, diğerleri için name kullan
    const userName = (role === 'BUSINESS' && ownerName) ? ownerName : name;
    
    const user = await prisma.user.create({
      data: {
        name: userName,
        email,
        phone,
        password: hashedPassword,
        city,
        district,
        role,
      },
    });

    // BUSINESS rolünde ise otomatik işletme oluştur
    let business = null;
    if (role === 'BUSINESS') {
      // Adres bilgisinden koordinat hesapla
      let coordinates = null;
      if (address && city && district) {
        coordinates = await getCoordinatesFromAddress(address, city, district);
        if (coordinates) {
          console.log('İşletme koordinatları hesaplandı:', coordinates);
        } else {
          console.log('Koordinat hesaplanamadı, varsayılan değerler kullanılacak');
        }
      }

      console.log(`[REGISTER] BUSINESS kayıt - İşletme oluşturuluyor, isActive: false olarak ayarlanacak`);
      
      // BUSINESS rolü için businessName kullan, yoksa name kullan
      const businessNameValue = businessName || name || 'İşletme Adı';
      
      business = await prisma.business.create({
        data: {
          name: businessNameValue,
          type: 'OTO_YIKAMA',
          address: address || (city && district ? `${district}, ${city}` : 'Adres bilgisi'),
          city: city || 'Şehir',
          district: district || 'İlçe',
          tcNo: tcNo || null,
          vergiNo: vergiNo || null,
          rating: 0,
          isActive: false, // Yeni kayıtlar onay bekliyor durumunda başlar - KESINLIKLE false
          isOpen: true,
          capacity: 3,
          ownerId: user.id,
          lat: coordinates ? coordinates.lat : null,
          lng: coordinates ? coordinates.lng : null,
        },
      });

      console.log(`[REGISTER] ✅ İşletme oluşturuldu - name: ${business.name}, isActive: ${business.isActive} (veritabanından kontrol)`);
      
      // Veritabanından tekrar kontrol et
      const verifyBusiness = await prisma.business.findUnique({
        where: { id: business.id },
        select: { isActive: true }
      });
      console.log(`[REGISTER] 🔍 Veritabanı doğrulama - isActive: ${verifyBusiness.isActive}`);
      
      if (verifyBusiness.isActive !== false) {
        console.error(`[REGISTER] ❌❌❌ SORUN: İşletme isActive: ${verifyBusiness.isActive} olarak kaydedilmiş! Beklenen: false`);
      }

      // Yeni işletme oluşturuldu: ilgili şehir odasına liste güncellendi yayını
      try {
        const io = req.app.get('io');
        if (io && business.city) {
          io.to(`city:${business.city.toLowerCase()}`).emit('businesses:changed', { city: business.city });
        }
      } catch (e) {
        console.error('Socket emit (business created) hatası:', e);
      }

      // Not: Yeni oluşturulan işletmelere otomatik bilgi ve görsel eklenmemesi istendiği için
      // varsayılan çalışma saatleri ve varsayılan hizmetlerin otomatik oluşturulması kaldırıldı.
    }

    // BUSINESS rolü için kayıt sonrası token döndürme - onay bekliyor mesajı döndür
    if (role === 'BUSINESS') {
      console.log('BUSINESS kayıt - Token döndürülmüyor, requiresApproval: true');
      return res.status(201).json({
        message: 'Kayıt işleminiz başarıyla tamamlandı. Hesabınız yönetici onayı beklemektedir. Onaylandıktan sonra giriş yapabilirsiniz.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          city: user.city,
          district: user.district,
          role: user.role,
        },
        business: business ? {
          id: business.id,
          name: business.name,
          isActive: business.isActive,
        } : null,
        requiresApproval: true,
        // Token kesinlikle döndürülmüyor
      });
    }

    // CUSTOMER rolü için token oluştur ve döndür
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        district: user.district,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({ error: 'Kayıt işlemi başarısız.' });
  }
});

// Kullanıcı giriş
router.post('/login', async (req, res) => {
  const { email, password, role = 'CUSTOMER' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
  }

  try {
    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }

    // Şifre kontrolü
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }

    // BUSINESS rolü için işletme aktiflik kontrolü (ÖNCE bu kontrol yapılmalı)
    if (user.role === 'BUSINESS') {
      console.log(`[LOGIN] BUSINESS kullanıcı giriş denemesi - email: ${user.email}, role: ${user.role}`);
      
      const business = await prisma.business.findFirst({
        where: { ownerId: user.id },
        select: { id: true, name: true, isActive: true }
      });

      if (!business) {
        console.log(`[LOGIN] ❌ İşletme bulunamadı - email: ${user.email}`);
        return res.status(403).json({ 
          error: 'İşletme bilgisi bulunamadı. Lütfen destek ekibi ile iletişime geçin.' 
        });
      }

      console.log(`[LOGIN] İşletme bulundu - name: ${business.name}, isActive: ${business.isActive} (type: ${typeof business.isActive})`);

      // Kesin kontrol - isActive false veya undefined ise engelle
      if (business.isActive === false || business.isActive === null || business.isActive === undefined) {
        console.log(`[LOGIN] ❌ BUSINESS login ENGELLENDİ - isActive: ${business.isActive}, email: ${user.email}, business: ${business.name}`);
        return res.status(403).json({ 
          error: 'Hesabınız henüz onaylanmamıştır. Lütfen yöneticinin onaylamasını bekleyin.' 
        });
      }

      // Ekstra güvenlik: isActive sadece true ise devam et
      if (business.isActive !== true) {
        console.log(`[LOGIN] ❌ BUSINESS login ENGELLENDİ - isActive beklenmeyen değer: ${business.isActive}, email: ${user.email}`);
        return res.status(403).json({ 
          error: 'Hesabınız henüz onaylanmamıştır. Lütfen yöneticinin onaylamasını bekleyin.' 
        });
      }

      console.log(`[LOGIN] ✅ BUSINESS login ONAYLANDI - isActive: ${business.isActive}, email: ${user.email}`);
    }

    // Role kontrolü (BUSINESS kontrolünden SONRA yapılmalı)
    if (role && user.role !== role) {
      return res.status(401).json({ error: 'Bu hesap türü için giriş yapamazsınız.' });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        district: user.district,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ error: 'Giriş işlemi başarısız.' });
  }
});

// Token doğrulama middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Erişim token\'ı gerekli.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token.' });
    }
    req.user = user;
    next();
  });
};

// Kullanıcı profilini getir
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        city: true,
        district: true,
        createdAt: true,
        businesses: {
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
            district: true,
            address: true,
            rating: true,
            isActive: true,
            isOpen: true,
            capacity: true,
            slotIntervalMin: true,
            imageUrl: true,
            logoUrl: true,
            setupCompleted: true,
          }
        }
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    // BUSINESS rolü için aktif işletme kontrolü
    if (user.role === 'BUSINESS') {
      console.log(`[PROFILE] BUSINESS kullanıcı profil isteği - email: ${user.email}`);
      
      const activeBusiness = user.businesses?.find(b => b.isActive === true);
      
      if (!activeBusiness) {
        console.log(`[PROFILE] ❌ BUSINESS profil ENGELLENDİ - Aktif işletme yok, email: ${user.email}`);
        // Token'ı geçersiz kıl
        return res.status(403).json({ 
          error: 'Hesabınız henüz onaylanmamıştır. Lütfen yöneticinin onaylamasını bekleyin.',
          requiresApproval: true
        });
      }
      
      console.log(`[PROFILE] ✅ BUSINESS profil ONAYLANDI - Aktif işletme: ${activeBusiness.name}, email: ${user.email}`);
    }

    res.json(user);
  } catch (error) {
    console.error('Profil getirme hatası:', error);
    res.status(500).json({ error: 'Profil bilgileri alınamadı.' });
  }
});

module.exports = { router, authenticateToken };
