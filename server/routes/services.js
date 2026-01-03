const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// İşletmeye ait hizmetleri getir
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const services = await prisma.service.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(services);
  } catch (error) {
    console.error('Hizmetler getirilirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Hizmet oluştur
router.post('/', async (req, res) => {
  try {
    const { name, price, durationMin, vehicleType, businessId } = req.body;
    
    const service = await prisma.service.create({
      data: {
        name,
        price,
        durationMin,
        vehicleType: vehicleType || 'SEDAN',
        businessId,
      },
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('Hizmet oluşturulurken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Hizmet sil
router.delete('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    await prisma.service.delete({
      where: { id: serviceId },
    });

    res.json({ message: 'Hizmet başarıyla silindi' });
  } catch (error) {
    console.error('Hizmet silinirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Hizmet güncelle
router.put('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { name, price, durationMin, vehicleType } = req.body;
    
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        name,
        price,
        durationMin,
        vehicleType,
      },
    });

    res.json(service);
  } catch (error) {
    console.error('Hizmet güncellenirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
