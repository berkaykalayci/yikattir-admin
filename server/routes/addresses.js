const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Kullanıcının tüm adreslerini getir
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const addresses = await prisma.address.findMany({
      where: {
        userId: userId
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(addresses);
  } catch (error) {
    console.error('Adresler getirilirken hata:', error);
    res.status(500).json({ error: 'Adresler getirilemedi' });
  }
});

// Yeni adres ekle
router.post('/', async (req, res) => {
  try {
    const { userId, title, addressLine1, addressLine2, city, district, postalCode, isDefault = false } = req.body;

    // Eğer varsayılan adres yapılıyorsa, diğer adresleri varsayılan olmaktan çıkar
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId,
        title,
        addressLine1,
        addressLine2,
        city,
        district,
        postalCode,
        isDefault
      }
    });

    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Adres eklenirken hata:', error);
    res.status(500).json({ error: 'Adres eklenemedi' });
  }
});

// Adresi varsayılan yap
router.patch('/:addressId/set-default', async (req, res) => {
  try {
    const { addressId } = req.params;

    // Önce tüm adresleri varsayılan olmaktan çıkar
    const address = await prisma.address.findUnique({
      where: { id: addressId }
    });

    if (!address) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    await prisma.address.updateMany({
      where: { userId: address.userId },
      data: { isDefault: false }
    });

    // Seçilen adresi varsayılan yap
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true }
    });

    res.json(updatedAddress);
  } catch (error) {
    console.error('Varsayılan adres güncellenirken hata:', error);
    res.status(500).json({ error: 'Varsayılan adres güncellenemedi' });
  }
});

// Adresi sil
router.delete('/:addressId', async (req, res) => {
  try {
    const { addressId } = req.params;

    const deletedAddress = await prisma.address.delete({
      where: { id: addressId }
    });

    res.json({ message: 'Adres silindi', address: deletedAddress });
  } catch (error) {
    console.error('Adres silinirken hata:', error);
    res.status(500).json({ error: 'Adres silinemedi' });
  }
});

// Adresi güncelle
router.put('/:addressId', async (req, res) => {
  try {
    const { addressId } = req.params;
    const { title, addressLine1, addressLine2, city, district, postalCode, isDefault } = req.body;

    // Eğer varsayılan adres yapılıyorsa, diğer adresleri varsayılan olmaktan çıkar
    if (isDefault) {
      const currentAddress = await prisma.address.findUnique({
        where: { id: addressId }
      });

      if (currentAddress) {
        await prisma.address.updateMany({
          where: { userId: currentAddress.userId },
          data: { isDefault: false }
        });
      }
    }

    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
        title,
        addressLine1,
        addressLine2,
        city,
        district,
        postalCode,
        isDefault
      }
    });

    res.json(updatedAddress);
  } catch (error) {
    console.error('Adres güncellenirken hata:', error);
    res.status(500).json({ error: 'Adres güncellenemedi' });
  }
});

module.exports = router;
