const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Kullanıcının favorilerini getir
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        business: {
          include: {
            services: true,
            workingHours: true,
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(favorites);
  } catch (error) {
    console.error('Favoriler getirme hatası:', error);
    res.status(500).json({ error: 'Favoriler getirilemedi' });
  }
});

// Favoriye ekle
router.post('/', async (req, res) => {
  try {
    const { userId, businessId } = req.body;
    
    // Zaten favori mi kontrol et
    const existingFavorite = await prisma.favorite.findFirst({
      where: { userId, businessId }
    });
    
    if (existingFavorite) {
      return res.status(400).json({ error: 'Bu işletme zaten favorilerinizde' });
    }
    
    const favorite = await prisma.favorite.create({
      data: { userId, businessId },
      include: {
        business: {
          include: {
            services: true,
            workingHours: true,
            reviews: true
          }
        }
      }
    });
    
    // Socket: favoriler güncellendi bilgisini ilgili müşteri odasına yayınla
    try {
      const io = req.app.get('io');
      if (io && userId) {
        io.to(`customer:${userId}`).emit('favorites:changed', { action: 'added', businessId });
      }
    } catch (e) {
      console.error('Socket emit (favorite add) hatası:', e);
    }

    res.status(201).json(favorite);
  } catch (error) {
    console.error('Favori ekleme hatası:', error);
    res.status(500).json({ error: 'Favori eklenemedi' });
  }
});

// Favoriden çıkar
router.delete('/user/:userId/business/:businessId', async (req, res) => {
  try {
    const { userId, businessId } = req.params;
    
    await prisma.favorite.deleteMany({
      where: { userId, businessId }
    });
    
    // Socket: favoriler güncellendi bilgisini ilgili müşteri odasına yayınla
    try {
      const io = req.app.get('io');
      if (io && userId) {
        io.to(`customer:${userId}`).emit('favorites:changed', { action: 'removed', businessId });
      }
    } catch (e) {
      console.error('Socket emit (favorite remove) hatası:', e);
    }

    res.json({ message: 'Favoriden çıkarıldı' });
  } catch (error) {
    console.error('Favori çıkarma hatası:', error);
    res.status(500).json({ error: 'Favori çıkarılamadı' });
  }
});

// Favori durumunu kontrol et
router.get('/user/:userId/business/:businessId', async (req, res) => {
  try {
    const { userId, businessId } = req.params;
    
    const favorite = await prisma.favorite.findFirst({
      where: { userId, businessId }
    });
    
    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('Favori durumu kontrol hatası:', error);
    res.status(500).json({ error: 'Favori durumu kontrol edilemedi' });
  }
});

module.exports = router;
