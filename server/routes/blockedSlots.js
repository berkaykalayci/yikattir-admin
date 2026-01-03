const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// İşletmenin engellenmiş saatlerini getir
router.get('/business/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date } = req.query;

    // İşletmenin sahibi olduğunu kontrol et
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true }
    });

    if (!business) {
      return res.status(404).json({ error: 'İşletme bulunamadı' });
    }

    if (business.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    const where = { businessId };
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.date = { gte: startDate, lt: endDate };
    }

    const blockedSlots = await prisma.blockedSlot.findMany({
      where,
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });

    res.json(blockedSlots);
  } catch (error) {
    console.error('Engellenmiş saatler getirilirken hata:', error);
    res.status(500).json({ error: 'Engellenmiş saatler getirilemedi' });
  }
});

// Saat engelle
router.post('/business/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, time, reason } = req.body;

    if (!date || !time) {
      return res.status(400).json({ error: 'Tarih ve saat gereklidir' });
    }

    // İşletmenin sahibi olduğunu kontrol et
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true }
    });

    if (!business) {
      return res.status(404).json({ error: 'İşletme bulunamadı' });
    }

    if (business.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    // Aynı tarih ve saat için zaten engellenmiş mi kontrol et
    const existingBlock = await prisma.blockedSlot.findUnique({
      where: {
        businessId_date_time: {
          businessId,
          date: new Date(date),
          time
        }
      }
    });

    if (existingBlock) {
      return res.status(409).json({ error: 'Bu saat zaten engellenmiş' });
    }

    const blockedSlot = await prisma.blockedSlot.create({
      data: {
        businessId,
        date: new Date(date),
        time,
        reason: reason || null
      }
    });

    // Socket.IO ile slot invalidation yayınla
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`business:${businessId}`).emit('slots:invalidate', {
          businessId,
          date,
          time
        });
      }
    } catch (e) {
      console.error('Socket emit (block slot) hatası:', e);
    }

    res.status(201).json(blockedSlot);
  } catch (error) {
    console.error('Saat engellenirken hata:', error);
    res.status(500).json({ error: 'Saat engellenemedi' });
  }
});

// Saat engelini kaldır
router.delete('/:blockedSlotId', authenticateToken, async (req, res) => {
  try {
    const { blockedSlotId } = req.params;

    // Engellenmiş saatin sahibini kontrol et
    const blockedSlot = await prisma.blockedSlot.findUnique({
      where: { id: blockedSlotId },
      include: { business: { select: { ownerId: true } } }
    });

    if (!blockedSlot) {
      return res.status(404).json({ error: 'Engellenmiş saat bulunamadı' });
    }

    if (blockedSlot.business.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    await prisma.blockedSlot.delete({
      where: { id: blockedSlotId }
    });

    // Socket.IO ile slot invalidation yayınla
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`business:${blockedSlot.businessId}`).emit('slots:invalidate', {
          businessId: blockedSlot.businessId,
          date: blockedSlot.date,
          time: blockedSlot.time
        });
      }
    } catch (e) {
      console.error('Socket emit (unblock slot) hatası:', e);
    }

    res.json({ message: 'Saat engeli kaldırıldı' });
  } catch (error) {
    console.error('Saat engeli kaldırılırken hata:', error);
    res.status(500).json({ error: 'Saat engeli kaldırılamadı' });
  }
});

module.exports = router;
