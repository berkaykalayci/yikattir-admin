const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Kullanıcının bildirimlerini getir
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(notifications);
  } catch (error) {
    console.error('Bildirimler getirme hatası:', error);
    res.status(500).json({ error: 'Bildirimler getirilemedi' });
  }
});

// Bildirimi okundu olarak işaretle
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    
    res.json(notification);
  } catch (error) {
    console.error('Bildirim okundu işaretleme hatası:', error);
    res.status(500).json({ error: 'Bildirim işaretlenemedi' });
  }
});

// Bildirimi sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.notification.delete({
      where: { id }
    });
    
    res.json({ message: 'Bildirim silindi' });
  } catch (error) {
    console.error('Bildirim silme hatası:', error);
    res.status(500).json({ error: 'Bildirim silinemedi' });
  }
});

// Tüm bildirimleri okundu olarak işaretle
router.patch('/user/:userId/mark-all-read', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    
    res.json({ message: 'Tüm bildirimler okundu olarak işaretlendi' });
  } catch (error) {
    console.error('Tüm bildirimleri okundu işaretleme hatası:', error);
    res.status(500).json({ error: 'Bildirimler işaretlenemedi' });
  }
});

// Okunmuş bildirimleri sil
router.delete('/user/:userId/delete-read', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await prisma.notification.deleteMany({
      where: { userId, isRead: true }
    });
    
    res.json({ message: 'Okunmuş bildirimler silindi' });
  } catch (error) {
    console.error('Okunmuş bildirimleri silme hatası:', error);
    res.status(500).json({ error: 'Bildirimler silinemedi' });
  }
});

// Yeni bildirim oluştur
router.post('/', async (req, res) => {
  try {
    const { userId, type, title, message, body } = req.body;
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message: message || body || '' // message veya body kullan
      }
    });
    
    res.json(notification);
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
    res.status(500).json({ error: 'Bildirim oluşturulamadı' });
  }
});

module.exports = router;
