const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/auth');
const { createAppointmentStatusNotification } = require('../services/notificationService');

const router = express.Router();
const prisma = new PrismaClient();

// Yeni randevu oluştur
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { businessId, serviceId, selectedServices, date, time, vehicleType, plate, notes, totalPrice } = req.body;
    const customerId = req.user.userId;

    if (!businessId || !serviceId || !date || !time || !vehicleType || !plate || !totalPrice) {
      return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

    // İşletme kontrolü
    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { capacity: true } });
    if (!business) {
      return res.status(404).json({ error: 'İşletme bulunamadı' });
    }

    // Aynı gün içinde aynı işletmeden randevu kontrolü
    // Tarihi normalize et: YYYY-MM-DD formatından UTC'de gün başlangıcı ve sonunu hesapla
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // UTC'de gün başlangıcı ve sonu (timezone sorunlarını önlemek için)
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    console.log('Randevu kontrolü (auth):', {
      customerId,
      businessId,
      dateStr,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        businessId,
        customerId,
        date: { gte: startDate, lte: endDate },
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    console.log('Mevcut randevu kontrolü sonucu (auth):', existingAppointment ? `VAR - ID: ${existingAppointment.id}` : 'YOK');

    if (existingAppointment) {
      console.log('Aynı gün randevu engellendi (auth):', existingAppointment.id);
      return res.status(409).json({ 
        error: 'Bu işletmeden bugün zaten bir randevunuz bulunmaktadır. Gün içinde aynı işletmeden sadece bir randevu alabilirsiniz.' 
      });
    }

    // Kapasite kontrolü: aynı gün, aynı saat için mevcut doluluk
    const existingCount = await prisma.appointment.count({
      where: {
        businessId,
        date: { gte: startDate, lte: endDate },
        time,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    if (existingCount >= (business.capacity || 1)) {
      return res.status(409).json({ error: 'Seçili saat dolu. Lütfen farklı bir saat seçin.' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        customerId,
        serviceId,
        selectedServices: selectedServices || null,
        date: new Date(date),
        time,
        vehicleType,
        plate,
        notes,
        totalPrice: parseInt(totalPrice),
        status: 'PENDING'
      },
      include: {
        business: {
          include: { owner: true }
        },
        customer: true,
        service: true
      }
    });

    // Socket.IO yayını (işletme ve müşteri odalarına) + slot invalidation
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`business:${businessId}`).emit('appointment:created', {
          id: appointment.id,
          businessId: appointment.businessId,
          customerName: appointment.customer?.name,
          serviceName: appointment.service?.name,
          time: appointment.time,
          date: appointment.date,
          phone: appointment.customer?.phone,
          status: appointment.status,
        });
        io.to(`customer:${customerId}`).emit('appointment:created', appointment);
        // Seçili günün slotlarını geçersiz kıl (yeniden yüklet)
        io.to(`business:${businessId}`).emit('slots:invalidate', { date: appointment.date });
        // İstatistiklerin değişmesine yol açtı -> işletme odasına stats invalidate
        io.to(`business:${businessId}`).emit('stats:invalidate');
      }
    } catch (e) {
      console.error('Socket emit hatası:', e);
    }

    // Randevu oluşturulduğunda bildirim gönder (PENDING durumu)
    try {
      const io = req.app.get('io');
      await createAppointmentStatusNotification({
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        businessId: appointment.businessId,
        oldStatus: null,
        newStatus: 'PENDING',
        appointmentData: {
          business: appointment.business,
          service: appointment.service,
          date: appointment.date,
          time: appointment.time
        },
        io
      });
    } catch (error) {
      console.error('Bildirim oluşturma hatası:', error);
      // Bildirim hatası randevu oluşturmayı engellemez
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Randevu oluşturma hatası:', error);
    res.status(500).json({ error: 'Randevu oluşturulamadı' });
  }
});

// Müşterinin randevularını getir
router.get('/customer/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const { status } = req.query;

  try {
    const where = { customerId };
    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            district: true,
            imageUrl: true,
            logoUrl: true,
            rating: true,
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            durationMin: true,
            vehicleType: true,
          }
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(appointments);
  } catch (error) {
    console.error('Randevuları getirme hatası:', {
      customerId,
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Randevular getirilemedi.', 
      details: error.message,
      customerId 
    });
  }
});

// İşletmenin randevularını getir
router.get('/business/:businessId', async (req, res) => {
  const { businessId } = req.params;
  const { status, date } = req.query;

  try {
    const where = { businessId };
    if (status) {
      where.status = status;
    }
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        service: true,
        reviews: true,
      },
      orderBy: { date: 'asc' },
    });

    res.json(appointments);
  } catch (error) {
    console.error('İşletme randevularını getirme hatası:', error);
    res.status(500).json({ error: 'Randevular getirilemedi.' });
  }
});

// Yeni randevu oluştur (public endpoint - authenticateToken yok)
router.post('/', async (req, res) => {
  const { businessId, customerId, serviceId, date, time, vehicleType, plate, notes } = req.body;

  if (!businessId || !customerId || !serviceId || !date || !time) {
    return res.status(400).json({ error: 'Gerekli alanlar eksik.' });
  }

  try {
    // İşletme kontrolü
    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { capacity: true } });
    if (!business) {
      return res.status(404).json({ error: 'İşletme bulunamadı.' });
    }

    // Aynı gün içinde aynı işletmeden randevu kontrolü
    // Tarihi normalize et: YYYY-MM-DD formatından UTC'de gün başlangıcı ve sonunu hesapla
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // UTC'de gün başlangıcı ve sonu (timezone sorunlarını önlemek için)
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    console.log('Randevu kontrolü (public):', {
      customerId,
      businessId,
      dateStr,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        businessId,
        customerId,
        date: { gte: startDate, lte: endDate },
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    console.log('Mevcut randevu kontrolü sonucu (public):', existingAppointment ? `VAR - ID: ${existingAppointment.id}` : 'YOK');

    if (existingAppointment) {
      console.log('Aynı gün randevu engellendi (public):', existingAppointment.id);
      return res.status(409).json({ 
        error: 'Bu işletmeden bugün zaten bir randevunuz bulunmaktadır. Gün içinde aynı işletmeden sadece bir randevu alabilirsiniz.' 
      });
    }

    // Kapasite kontrolü: aynı gün, aynı saat için mevcut doluluk
    const existingCount = await prisma.appointment.count({
      where: {
        businessId,
        date: { gte: startDate, lte: endDate },
        time,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    if (existingCount >= (business.capacity || 1)) {
      return res.status(409).json({ error: 'Seçili saat dolu. Lütfen farklı bir saat seçin.' });
    }

    // Hizmet bilgilerini al
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { business: true },
    });

    if (!service) {
      return res.status(404).json({ error: 'Hizmet bulunamadı.' });
    }

    // Randevu oluştur
    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        customerId,
        serviceId,
        date: new Date(date),
        time,
        vehicleType,
        plate,
        notes,
        totalPrice: service.price,
        status: 'PENDING',
      },
      include: {
        business: true,
        service: true,
      },
    });

    // Socket.IO yayını (işletme ve müşteri odalarına) + slot invalidation
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`business:${businessId}`).emit('appointment:created', {
          id: appointment.id,
          businessId: appointment.businessId,
          customerId: appointment.customerId,
          serviceId: appointment.serviceId,
          time: appointment.time,
          date: appointment.date,
          status: appointment.status,
        });
        io.to(`customer:${customerId}`).emit('appointment:created', appointment);
        io.to(`business:${businessId}`).emit('slots:invalidate', { date: appointment.date });
        io.to(`business:${businessId}`).emit('stats:invalidate');
      }
    } catch (e) {
      console.error('Socket emit hatası:', e);
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Randevu oluşturma hatası:', error);
    res.status(500).json({ error: 'Randevu oluşturulamadı.', details: error.message });
  }
});

// Randevu durumunu güncelle
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum.' });
  }

  try {
    // Eski durumu al
    const oldAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        business: true,
        service: true,
        customer: true,
      },
    });

    if (!oldAppointment) {
      return res.status(404).json({ error: 'Randevu bulunamadı.' });
    }

    const oldStatus = oldAppointment.status;

    // Durumu güncelle
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        business: true,
        service: true,
        customer: true,
      },
    });

    // Socket.IO: Durum güncellemesini yayınla (işletme ve müşteri odalarına) + slot invalidation
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`business:${appointment.businessId}`).emit('appointment:updated', {
          id: appointment.id,
          businessId: appointment.businessId,
          customerId: appointment.customerId,
          serviceId: appointment.serviceId,
          status: appointment.status,
          date: appointment.date,
          time: appointment.time,
        });
        io.to(`customer:${appointment.customerId}`).emit('appointment:updated', appointment);
        io.to(`business:${appointment.businessId}`).emit('slots:invalidate', { date: appointment.date });
        io.to(`business:${appointment.businessId}`).emit('stats:invalidate');
      }
    } catch (e) {
      console.error('Socket emit (status) hatası:', e);
    }

    // Durum değiştiyse bildirim gönder
    if (oldStatus !== status) {
      try {
        const io = req.app.get('io');
        await createAppointmentStatusNotification({
          appointmentId: appointment.id,
          customerId: appointment.customerId,
          businessId: appointment.businessId,
          oldStatus,
          newStatus: status,
          appointmentData: {
            business: appointment.business,
            service: appointment.service,
            date: appointment.date,
            time: appointment.time
          },
          io
        });
      } catch (error) {
        console.error('Bildirim oluşturma hatası:', error);
        // Bildirim hatası durum güncellemesini engellemez
      }
    }

    res.json(appointment);
  } catch (error) {
    console.error('Randevu durumu güncelleme hatası:', error);
    res.status(500).json({ error: 'Randevu durumu güncellenemedi.' });
  }
});

// Randevu sil
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.appointment.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Randevu silme hatası:', error);
    res.status(500).json({ error: 'Randevu silinemedi.' });
  }
});

// Randevu onayla
router.patch('/:id/confirm', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Eski durumu al
    const oldAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        business: true,
        service: true,
        customer: true,
      },
    });

    if (!oldAppointment) {
      return res.status(404).json({ error: 'Randevu bulunamadı.' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: {
        customer: true,
        business: {
          include: { owner: true }
        },
        service: true
      }
    });

    // Bildirim gönder
    try {
      const io = req.app.get('io');
      await createAppointmentStatusNotification({
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        businessId: appointment.businessId,
        oldStatus: oldAppointment.status,
        newStatus: 'CONFIRMED',
        appointmentData: {
          business: appointment.business,
          service: appointment.service,
          date: appointment.date,
          time: appointment.time
        },
        io
      });
    } catch (error) {
      console.error('Bildirim oluşturma hatası:', error);
    }

    res.json(appointment);
  } catch (error) {
    console.error('Randevu onaylama hatası:', error);
    res.status(500).json({ error: 'Randevu onaylanamadı.' });
  }
});

// Randevu reddet
router.patch('/:id/reject', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Eski durumu al
    const oldAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        business: true,
        service: true,
        customer: true,
      },
    });

    if (!oldAppointment) {
      return res.status(404).json({ error: 'Randevu bulunamadı.' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: {
        customer: true,
        business: {
          include: { owner: true }
        },
        service: true
      }
    });

    // Bildirim gönder
    try {
      const io = req.app.get('io');
      await createAppointmentStatusNotification({
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        businessId: appointment.businessId,
        oldStatus: oldAppointment.status,
        newStatus: 'REJECTED',
        appointmentData: {
          business: appointment.business,
          service: appointment.service,
          date: appointment.date,
          time: appointment.time
        },
        io
      });
    } catch (error) {
      console.error('Bildirim oluşturma hatası:', error);
    }

    res.json(appointment);
  } catch (error) {
    console.error('Randevu reddetme hatası:', error);
    res.status(500).json({ error: 'Randevu reddedilemedi.' });
  }
});

// Randevu tamamla
router.patch('/:id/complete', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Eski durumu al
    const oldAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        business: true,
        service: true,
        customer: true,
      },
    });

    if (!oldAppointment) {
      return res.status(404).json({ error: 'Randevu bulunamadı.' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: {
        customer: true,
        business: {
          include: { owner: true }
        },
        service: true
      }
    });

    // Bildirim gönder
    try {
      const io = req.app.get('io');
      await createAppointmentStatusNotification({
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        businessId: appointment.businessId,
        oldStatus: oldAppointment.status,
        newStatus: 'COMPLETED',
        appointmentData: {
          business: appointment.business,
          service: appointment.service,
          date: appointment.date,
          time: appointment.time
        },
        io
      });
    } catch (error) {
      console.error('Bildirim oluşturma hatası:', error);
    }

    res.json(appointment);
  } catch (error) {
    console.error('Randevu tamamlama hatası:', error);
    res.status(500).json({ error: 'Randevu tamamlanamadı.' });
  }
});

module.exports = router;
