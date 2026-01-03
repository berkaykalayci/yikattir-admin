const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Kullanıcı profili getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        district: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Kullanıcı profili getirme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı profili getirilemedi' });
  }
});

// Kullanıcı profili güncelle
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, city, district } = req.body;
    
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        phone,
        city,
        district
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        district: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.json(user);
  } catch (error) {
    console.error('Kullanıcı profili güncelleme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı profili güncellenemedi' });
  }
});

// Kullanıcının adreslerini getir
router.get('/:id/addresses', async (req, res) => {
  try {
    const { id } = req.params;
    
    const addresses = await prisma.address.findMany({
      where: { userId: id },
      orderBy: { isDefault: 'desc' }
    });
    
    res.json(addresses);
  } catch (error) {
    console.error('Adresler getirme hatası:', error);
    res.status(500).json({ error: 'Adresler getirilemedi' });
  }
});

// Kullanıcının ödeme yöntemlerini getir
router.get('/:id/payment-methods', async (req, res) => {
  try {
    const { id } = req.params;
    
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: id },
      orderBy: { isDefault: 'desc' }
    });
    
    res.json(paymentMethods);
  } catch (error) {
    console.error('Ödeme yöntemleri getirme hatası:', error);
    res.status(500).json({ error: 'Ödeme yöntemleri getirilemedi' });
  }
});

// Yeni adres ekle
router.post('/:id/addresses', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, addressLine1, addressLine2, city, district, postalCode, isDefault } = req.body;
    
    // Eğer varsayılan adres olarak işaretleniyorsa, diğerlerini false yap
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: id },
        data: { isDefault: false }
      });
    }
    
    const address = await prisma.address.create({
      data: {
        userId: id,
        title,
        addressLine1,
        addressLine2,
        city,
        district,
        postalCode,
        isDefault: isDefault || false
      }
    });
    
    res.json(address);
  } catch (error) {
    console.error('Adres ekleme hatası:', error);
    res.status(500).json({ error: 'Adres eklenemedi' });
  }
});

// Yeni ödeme yöntemi ekle
router.post('/:id/payment-methods', async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, last4, expiryMonth, expiryYear, isDefault } = req.body;
    
    // Eğer varsayılan ödeme yöntemi olarak işaretleniyorsa, diğerlerini false yap
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: id },
        data: { isDefault: false }
      });
    }
    
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: id,
        brand,
        last4,
        expiryMonth,
        expiryYear,
        isDefault: isDefault || false
      }
    });
    
    res.json(paymentMethod);
  } catch (error) {
    console.error('Ödeme yöntemi ekleme hatası:', error);
    res.status(500).json({ error: 'Ödeme yöntemi eklenemedi' });
  }
});

module.exports = router;
