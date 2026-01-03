const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Müşterinin kartlarını getir
router.get('/customer/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    console.log('Payment Methods - User ID:', req.user.userId, 'Type:', typeof req.user.userId);
    console.log('Payment Methods - Customer ID:', customerId, 'Type:', typeof customerId);
    
    // Sadece kendi kartlarını görebilir
    if (String(req.user.userId) !== String(customerId)) {
      console.log('Payment Methods - ID mismatch, returning 403');
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    const cards = await prisma.card.findMany({
      where: { customerId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(cards);
  } catch (error) {
    console.error('Kartlar getirilirken hata:', error);
    res.status(500).json({ error: 'Kartlar getirilemedi' });
  }
});

// Yeni kart ekle
router.post('/customer/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { cardNumber, expiryDate, cvv, cardHolder, isDefault } = req.body;
    
    // Sadece kendi kartını ekleyebilir
    if (String(req.user.userId) !== String(customerId)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    // Kart numarasından son 4 haneyi al
    const lastFour = cardNumber.replace(/\s/g, '').slice(-4);
    
    // Kart tipini belirle (basit kontrol)
    const cardType = cardNumber.startsWith('4') ? 'visa' : 
                    cardNumber.startsWith('5') ? 'mastercard' : 'other';

    // Eğer varsayılan kart olarak ayarlanıyorsa, diğer kartları varsayılan olmaktan çıkar
    if (isDefault) {
      await prisma.card.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const newCard = await prisma.card.create({
      data: {
        customerId,
        cardNumber: cardNumber.replace(/\s/g, ''), // Boşlukları kaldır
        lastFour,
        expiryDate,
        cvv,
        cardHolder,
        cardType,
        isDefault: isDefault || false
      }
    });

    res.status(201).json(newCard);
  } catch (error) {
    console.error('Kart eklenirken hata:', error);
    res.status(500).json({ error: 'Kart eklenemedi' });
  }
});

// Kartı varsayılan yap
router.patch('/:cardId/default', authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;
    
    // Kartın sahibini kontrol et
    const card = await prisma.card.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return res.status(404).json({ error: 'Kart bulunamadı' });
    }

    if (String(card.customerId) !== String(req.user.userId)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    // Diğer kartları varsayılan olmaktan çıkar
    await prisma.card.updateMany({
      where: { customerId: card.customerId, isDefault: true },
      data: { isDefault: false }
    });

    // Bu kartı varsayılan yap
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: { isDefault: true }
    });

    res.json(updatedCard);
  } catch (error) {
    console.error('Kart varsayılan yapılırken hata:', error);
    res.status(500).json({ error: 'Kart varsayılan yapılamadı' });
  }
});

// Kartı sil
router.delete('/:cardId', authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;
    
    // Kartın sahibini kontrol et
    const card = await prisma.card.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return res.status(404).json({ error: 'Kart bulunamadı' });
    }

    if (String(card.customerId) !== String(req.user.userId)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    await prisma.card.delete({
      where: { id: cardId }
    });

    res.json({ message: 'Kart başarıyla silindi' });
  } catch (error) {
    console.error('Kart silinirken hata:', error);
    res.status(500).json({ error: 'Kart silinemedi' });
  }
});

module.exports = router;
