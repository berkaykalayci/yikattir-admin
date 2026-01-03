const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer  = require('multer');
const path = require('path');
const authenticateToken = require('../middleware/auth');
const { getCoordinatesFromAddress } = require('../services/geocoding');

const router = express.Router();
const prisma = new PrismaClient();

// Multer ayarları (uploads/businesses altında orijinal isim + timestamp)
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads', 'businesses'));
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Tüm işletmeleri listele (müşteri için)
router.get('/', async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
        district: true,
        address: true,
        rating: true,
        isOpen: true,
        capacity: true,
        imageUrl: true,
        logoUrl: true,
        lat: true,
        lng: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Görsel URL'lerindeki eski IP adreslerini mevcut host IP'si ile değiştir
    const currentHost = `${req.protocol}://${req.get('host')}`;
    const businessesWithUpdatedUrls = businesses.map(business => {
      if (business.imageUrl) {
        business.imageUrl = business.imageUrl.replace(
          /http:\/\/(192\.168\.1\.\d+|10\.0\.2\.2|localhost):3001/g,
          currentHost
        );
      }
      if (business.logoUrl) {
        business.logoUrl = business.logoUrl.replace(
          /http:\/\/(192\.168\.1\.\d+|10\.0\.2\.2|localhost):3001/g,
          currentHost
        );
      }
      return business;
    });

    res.json(businessesWithUpdatedUrls);
  } catch (error) {
    console.error('İşletmeler listelenirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// İşletme detaylarını getir (müşteri için)
router.get('/:id', async (req, res) => {
  try {
  const { id } = req.params;
    
    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        services: true,
        workingHours: true,
        reviews: {
          include: {
            appointment: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!business) {
      return res.status(404).json({ error: 'İşletme bulunamadı' });
    }

    // Görsel URL'lerindeki eski IP adreslerini mevcut host IP'si ile değiştir
    const currentHost = `${req.protocol}://${req.get('host')}`;
    if (business.imageUrl) {
      business.imageUrl = business.imageUrl.replace(
        /http:\/\/(192\.168\.1\.\d+|10\.0\.2\.2|localhost):3001/g,
        currentHost
      );
    }
    if (business.logoUrl) {
      business.logoUrl = business.logoUrl.replace(
        /http:\/\/(192\.168\.1\.\d+|10\.0\.2\.2|localhost):3001/g,
        currentHost
      );
    }

    res.json(business);
  } catch (error) {
    console.error('İşletme detayları getirilirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// User'ın sahip olduğu işletmeyi bul
router.get('/owner/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const business = await prisma.business.findFirst({
      where: { ownerId: userId },
      select: { id: true, name: true, setupCompleted: true }
    });

    if (!business) {
      return res.status(404).json({ error: 'İşletme bulunamadı' });
    }

    res.json(business);
  } catch (error) {
    console.error('İşletme bulunurken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// İşletme setup'ını tamamla
router.post('/setup/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // İşletmeyi bul
    const business = await prisma.business.findFirst({
      where: { ownerId: userId },
      select: { id: true, setupCompleted: true }
    });

    if (!business) {
      return res.status(404).json({ error: 'İşletme bulunamadı' });
    }

    // Setup'ı tamamla
    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: { setupCompleted: true },
      select: { id: true, setupCompleted: true }
    });

    console.log(`[SETUP] İşletme setup tamamlandı - businessId: ${business.id}, userId: ${userId}`);

    res.json({ 
      success: true, 
      message: 'İşletme kurulumu tamamlandı',
      business: updatedBusiness 
    });
  } catch (error) {
    console.error('Setup tamamlama hatası:', error);
    res.status(500).json({ error: 'Setup tamamlanırken bir hata oluştu' });
  }
});

// İşletme bilgilerini getir
router.get('/profile/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        workingHours: true,
        services: true,
        reviews: {
          include: {
            appointment: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'İşletme bulunamadı' });
    }

    res.json(business);
  } catch (error) {
    console.error('İşletme profili getirilirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Belirli bir gün için uygun randevu saatlerini getir
// GET /businesses/:businessId/available-slots?date=YYYY-MM-DD&intervalMin=30
router.get('/:businessId/available-slots', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, intervalMin } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date (YYYY-MM-DD) gereklidir' });
    }

    // İşletme ve kapasiteyi al
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, capacity: true, slotIntervalMin: true }
    });
    if (!business) {
      return res.status(404).json({ error: 'İşletme bulunamadı' });
    }

    // Çalışma saatlerini al (günün gün numarasına göre)
    const jsDay = new Date(date + 'T00:00:00.000Z').getDay(); // 0=Sun ... 6=Sat
    const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Mon ... 7=Sun

    const workingHour = await prisma.workingHour.findFirst({
      where: { businessId, dayOfWeek },
      select: { isOpen: true, openTime: true, closeTime: true }
    });

    if (!workingHour || !workingHour.isOpen || !workingHour.openTime || !workingHour.closeTime) {
      return res.json({ date, slots: [] });
    }

    const interval = Math.max(5, parseInt(String(intervalMin || business.slotIntervalMin || 30), 10) || 30); // güvenlik için min 5 dk

    // Aynı gün için mevcut randevular (sadece saat alanı gerekli)
    // Tarihi UTC olarak parse et (timezone sorunlarını önlemek için)
    const targetDate = new Date(date + 'T00:00:00.000Z');
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        businessId,
        date: { gte: targetDate, lt: nextDay },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { time: true },
    });

    // Aynı gün için engellenmiş saatler
    const blockedSlots = await prisma.blockedSlot.findMany({
      where: {
        businessId,
        date: { gte: targetDate, lt: nextDay },
      },
      select: { time: true },
    });

    // Her time stringi için kaç randevu olduğunu say
    const timeToCount = existingAppointments.reduce((acc, ap) => {
      const t = ap.time;
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    // Engellenmiş saatleri Set olarak sakla (null değerleri filtrele)
    const blockedTimes = new Set(blockedSlots.filter(bs => bs.time).map(bs => bs.time));

    // Zaman stringini dakika cinsinden çeviriciler
    const parseHm = (hm) => {
      if (!hm || typeof hm !== 'string') {
        throw new Error(`Geçersiz saat formatı: ${hm}`);
      }
      const parts = hm.split(':');
      if (parts.length !== 2) {
        throw new Error(`Geçersiz saat formatı: ${hm}`);
      }
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) {
        throw new Error(`Geçersiz saat formatı: ${hm}`);
      }
      return h * 60 + m;
    };
    const formatHm = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      return `${hh}:${mm}`;
    };

    // Saat formatlarını kontrol et
    if (!workingHour.openTime || !workingHour.closeTime) {
      console.error('Çalışma saatleri eksik:', { openTime: workingHour.openTime, closeTime: workingHour.closeTime });
      return res.json({ date, slots: [] });
    }

    const startMin = parseHm(workingHour.openTime);
    const endMin = parseHm(workingHour.closeTime);

    const slots = [];
    for (let t = startMin; t <= endMin - interval; t += interval) {
      const label = formatHm(t);
      const bookedCount = timeToCount[label] || 0;
      const isBlocked = blockedTimes.has(label);
      const available = !isBlocked && bookedCount < (business.capacity || 1);
      slots.push({ 
        time: label, 
        available, 
        bookedCount, 
        capacity: business.capacity || 1,
        isBlocked 
      });
    }

    return res.json({ date, intervalMin: interval, slots });
  } catch (error) {
    console.error('Uygun saatler oluşturulurken hata:', {
      message: error.message,
      stack: error.stack,
      businessId: req.params.businessId,
      date: req.query.date,
      error: error
    });
    res.status(500).json({ error: 'Sunucu hatası', details: error.message });
  }
});

// İşletme istatistiklerini getir
router.get('/stats/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    // Bugünkü randevular
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await prisma.appointment.count({
      where: {
        businessId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Bu ayki gelir
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await prisma.appointment.aggregate({
      where: {
        businessId,
        date: {
          gte: startOfMonth,
        },
        status: 'COMPLETED',
      },
      _sum: {
        totalPrice: true,
      },
    });

    // Toplam müşteri sayısı
    const totalCustomers = await prisma.appointment.groupBy({
      by: ['customerId'],
      where: {
        businessId,
      },
    });

    // Ortalama puan
    const avgRating = await prisma.review.aggregate({
      where: {
        businessId,
      },
      _avg: {
        rating: true,
      },
    });

    const stats = {
      todayAppointments,
      monthlyRevenue: monthlyRevenue._sum.totalPrice || 0,
      totalCustomers: totalCustomers.length,
      avgRating: avgRating._avg.rating || 0,
    };

    res.json(stats);
  } catch (error) {
    console.error('İşletme istatistikleri getirilirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// İşletme randevularını getir
router.get('/appointments/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status, date } = req.query;

    let whereClause = { businessId };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (date) {
      // Tarih string'i olarak gelen date'i Date objesine çevir
      const targetDate = new Date(date + 'T00:00:00.000Z');
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereClause.date = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    res.json(appointments);
  } catch (error) {
    console.error('İşletme randevuları getirilirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// İşletme çalışma saatlerini güncelle
router.put('/working-hours/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { workingHours, slotIntervalMin } = req.body;

    // Mevcut çalışma saatlerini sil
    await prisma.workingHour.deleteMany({
      where: { businessId },
    });

    // Yeni çalışma saatlerini ekle
    const newWorkingHours = await prisma.workingHour.createMany({
      data: workingHours.map(wh => ({
        ...wh,
        businessId,
      })),
    });

    // Slot aralığını güncelle (opsiyonel)
    if (slotIntervalMin) {
      const interval = Math.max(5, parseInt(String(slotIntervalMin), 10) || 30);
      await prisma.business.update({
        where: { id: businessId },
        data: { slotIntervalMin: interval },
      });
    }

    res.json({ message: 'Çalışma saatleri güncellendi', workingHours: newWorkingHours, slotIntervalMin: slotIntervalMin || undefined });
  } catch (error) {
    console.error('Çalışma saatleri güncellenirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// İşletme durumunu güncelle (açık/kapalı)
router.put('/status/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { isOpen } = req.body;

    const business = await prisma.business.update({
      where: { id: businessId },
      data: { isOpen },
    });

    // Socket: ilgili şehir odasına işletme listesi güncellendi bilgisi yayınla
    try {
      const io = req.app.get('io');
      if (io && business.city) {
        io.to(`city:${business.city.toLowerCase()}`).emit('businesses:changed', { city: business.city });
      }
    } catch (e) {
      console.error('Socket emit (business status) hatası:', e);
    }

    res.json({ message: 'İşletme durumu güncellendi', business });
  } catch (error) {
    console.error('İşletme durumu güncellenirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// İşletme koordinatlarını güncelle (adres bilgisinden)
router.post('/update-coordinates/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { address, city, district } = req.body;

    if (!address || !city || !district) {
      return res.status(400).json({ error: 'Adres, şehir ve ilçe bilgisi gerekli' });
    }

    // Koordinat hesapla
    const coordinates = await getCoordinatesFromAddress(address, city, district);
    
    if (!coordinates) {
      return res.status(400).json({ error: 'Koordinat hesaplanamadı' });
    }

    // İşletmeyi güncelle
    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
    });

    res.json({ 
      message: 'Koordinatlar güncellendi', 
      business: {
        id: business.id,
        name: business.name,
        lat: business.lat,
        lng: business.lng,
        formattedAddress: coordinates.formattedAddress
      }
    });
  } catch (error) {
    console.error('Koordinat güncellenirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// İşletme görselini URL ile güncelle
router.put('/:businessId/image', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Geçerli bir imageUrl gereklidir' });
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data: { imageUrl },
    });

    // Socket: şehir odasına işletmeler güncellendi bilgisini yayınla
    try {
      const io = req.app.get('io');
      if (io && business.city) {
        io.to(`city:${business.city.toLowerCase()}`).emit('businesses:changed', { city: business.city });
      }
    } catch (e) {
      console.error('Socket emit (business image set) hatası:', e);
    }

    res.json({ message: 'Görsel güncellendi', business: { id: business.id, imageUrl: business.imageUrl } });
  } catch (error) {
    console.error('Görsel güncellenirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// İşletme görselini temizle
router.delete('/:businessId/image', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const business = await prisma.business.update({
      where: { id: businessId },
      data: { imageUrl: null },
    });

    // Socket: şehir odasına işletmeler güncellendi bilgisini yayınla
    try {
      const io = req.app.get('io');
      if (io && business.city) {
        io.to(`city:${business.city.toLowerCase()}`).emit('businesses:changed', { city: business.city });
      }
    } catch (e) {
      console.error('Socket emit (business image delete) hatası:', e);
    }

    res.json({ message: 'Görsel kaldırıldı', business: { id: business.id, imageUrl: business.imageUrl } });
  } catch (error) {
    console.error('Görsel kaldırılırken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Dosya yükleme: tek görsel
router.post('/:businessId/image/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'image alanı zorunludur' });
    }
    // Sunulan URL
    const publicUrl = `${req.protocol}://${req.get('host')}/uploads/businesses/${req.file.filename}`;

    const business = await prisma.business.update({
      where: { id: businessId },
      data: { imageUrl: publicUrl },
    });

    // Socket: şehir odasına bildirim
    try {
      const io = req.app.get('io');
      if (io && business.city) {
        io.to(`city:${business.city.toLowerCase()}`).emit('businesses:changed', { city: business.city });
      }
    } catch (e) {
      console.error('Socket emit (business image upload) hatası:', e);
    }

    res.json({ message: 'Görsel yüklendi', imageUrl: publicUrl });
  } catch (error) {
    console.error('Görsel yüklenirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Tüm işletmelerin koordinatlarını toplu güncelle
router.post('/update-all-coordinates', authenticateToken, async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      where: {
        isActive: true,
        OR: [
          { lat: null },
          { lng: null }
        ]
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        district: true,
        lat: true,
        lng: true
      }
    });

    const results = [];
    
    for (const business of businesses) {
      if (business.address && business.city && business.district) {
        const coordinates = await getCoordinatesFromAddress(
          business.address, 
          business.city, 
          business.district
        );
        
        if (coordinates) {
          await prisma.business.update({
            where: { id: business.id },
            data: {
              lat: coordinates.lat,
              lng: coordinates.lng,
            },
          });
          
          results.push({
            id: business.id,
            name: business.name,
            success: true,
            coordinates: coordinates
          });
        } else {
          results.push({
            id: business.id,
            name: business.name,
            success: false,
            error: 'Koordinat hesaplanamadı'
          });
        }
        
        // API rate limit'i için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    res.json({ 
      message: 'Toplu koordinat güncelleme tamamlandı', 
      results,
      total: businesses.length,
      successful: results.filter(r => r.success).length
    });
  } catch (error) {
    console.error('Toplu koordinat güncelleme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;