const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// İşletmenin aldığı tüm değerlendirmeleri getir
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { businessId },
      include: {
        appointment: {
          include: {
            customer: {
              select: { id: true, name: true }
            },
            service: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      appointmentId: r.appointmentId,
      customerName: r.appointment?.customer?.name || 'Anonim',
      serviceName: r.appointment?.service?.name || 'Hizmet',
    })));
  } catch (error) {
    console.error('İşletme değerlendirmeleri getirilirken hata:', error);
    res.status(500).json({ error: 'Değerlendirmeler getirilemedi' });
  }
});

// Kullanıcının tüm değerlendirmelerini getir
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const reviews = await prisma.review.findMany({
      where: {
        appointment: {
          customerId: userId
        }
      },
      include: {
        appointment: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                city: true,
                district: true
              }
            },
            service: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Veriyi frontend için formatla
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      businessName: review.appointment.business.name,
      businessLocation: `${review.appointment.business.district}, ${review.appointment.business.city}`,
      service: review.appointment.service.name,
      rating: review.rating,
      comment: review.comment,
      date: new Date(review.createdAt).toLocaleDateString('tr-TR'),
      appointmentId: review.appointmentId,
      businessId: review.businessId,
      canEdit: true // Şimdilik hepsini düzenlenebilir yap
    }));

    res.json(formattedReviews);
  } catch (error) {
    console.error('Kullanıcı değerlendirmeleri getirilirken hata:', error);
    res.status(500).json({ error: 'Değerlendirmeler getirilemedi' });
  }
});

// Review oluştur
router.post('/', async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body;

    // Validation
    if (!appointmentId || !rating) {
      return res.status(400).json({ error: 'Appointment ID ve rating gereklidir' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating 1-5 arasında olmalıdır' });
    }

    // Appointment'ı kontrol et
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        business: true,
        customer: true
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }

    // Appointment'ın completed olup olmadığını kontrol et
    if (appointment.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Sadece tamamlanan randevular değerlendirilebilir' });
    }

    // Bu appointment için zaten review var mı kontrol et
    const existingReview = await prisma.review.findUnique({
      where: { appointmentId }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'Bu randevu için zaten değerlendirme yapılmış' });
    }

    // Review oluştur
    const review = await prisma.review.create({
      data: {
        businessId: appointment.businessId,
        appointmentId: appointmentId,
        rating: parseInt(rating),
        comment: comment || null
      },
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
    });

    // Business'ın ortalama rating'ini güncelle
    const businessReviews = await prisma.review.findMany({
      where: { businessId: appointment.businessId },
      select: { rating: true }
    });

    const avgRating = businessReviews.reduce((sum, r) => sum + r.rating, 0) / businessReviews.length;

    await prisma.business.update({
      where: { id: appointment.businessId },
      data: { rating: avgRating }
    });

    // Socket: ilgili şehir odasına ve işletme odasına review olayı yayınla
    try {
      const io = req.app.get('io');
      if (io) {
        if (appointment.business?.city) {
          io.to(`city:${appointment.business.city.toLowerCase()}`).emit('reviews:changed', {
            businessId: appointment.businessId,
            rating: avgRating,
          });
        }
        io.to(`business:${appointment.businessId}`).emit('reviews:changed', {
          businessId: appointment.businessId,
          rating: avgRating,
        });
        io.to(`business:${appointment.businessId}`).emit('stats:invalidate');
      }
    } catch (e) {
      console.error('Socket emit (review create) hatası:', e);
    }

    res.status(201).json({
      message: 'Değerlendirme başarıyla oluşturuldu',
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        customerName: review.appointment.customer.name,
        createdAt: review.createdAt
      }
    });

  } catch (error) {
    console.error('Review oluşturma hatası:', error);
    res.status(500).json({ error: 'Değerlendirme oluşturulamadı' });
  }
});

// Review'ı güncelle
router.put('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating 1-5 arasında olmalıdır' });
    }

    // Review'ı bul
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        appointment: {
          include: {
            business: true
          }
        }
      }
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Değerlendirme bulunamadı' });
    }

    // Review'ı güncelle
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: parseInt(rating),
        comment: comment || null
      }
    });

    // Business'ın ortalama rating'ini güncelle
    const businessReviews = await prisma.review.findMany({
      where: { businessId: existingReview.businessId },
      select: { rating: true }
    });

    const avgRating = businessReviews.reduce((sum, r) => sum + r.rating, 0) / businessReviews.length;

    await prisma.business.update({
      where: { id: existingReview.businessId },
      data: { rating: avgRating }
    });

    // Socket: review değişiklik olayı yayınla
    try {
      const io = req.app.get('io');
      if (io) {
        if (existingReview.appointment?.business?.city) {
          io.to(`city:${existingReview.appointment.business.city.toLowerCase()}`).emit('reviews:changed', {
            businessId: existingReview.businessId,
            rating: avgRating,
          });
        }
        io.to(`business:${existingReview.businessId}`).emit('reviews:changed', {
          businessId: existingReview.businessId,
          rating: avgRating,
        });
        io.to(`business:${existingReview.businessId}`).emit('stats:invalidate');
      }
    } catch (e) {
      console.error('Socket emit (review update) hatası:', e);
    }

    res.json({
      message: 'Değerlendirme başarıyla güncellendi',
      review: updatedReview
    });

  } catch (error) {
    console.error('Review güncelleme hatası:', error);
    res.status(500).json({ error: 'Değerlendirme güncellenemedi' });
  }
});

// Review'ı sil
router.delete('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Review'ı bul
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        appointment: {
          include: {
            business: true
          }
        }
      }
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Değerlendirme bulunamadı' });
    }

    // Review'ı sil
    await prisma.review.delete({
      where: { id: reviewId }
    });

    // Business'ın ortalama rating'ini güncelle
    const businessReviews = await prisma.review.findMany({
      where: { businessId: existingReview.businessId },
      select: { rating: true }
    });

    const avgRating = businessReviews.length > 0 
      ? businessReviews.reduce((sum, r) => sum + r.rating, 0) / businessReviews.length 
      : 0;

    await prisma.business.update({
      where: { id: existingReview.businessId },
      data: { rating: avgRating }
    });

    // Socket: review silindi olayı yayınla
    try {
      const io = req.app.get('io');
      if (io) {
        if (existingReview.appointment?.business?.city) {
          io.to(`city:${existingReview.appointment.business.city.toLowerCase()}`).emit('reviews:changed', {
            businessId: existingReview.businessId,
            rating: avgRating,
          });
        }
        io.to(`business:${existingReview.businessId}`).emit('reviews:changed', {
          businessId: existingReview.businessId,
          rating: avgRating,
        });
        io.to(`business:${existingReview.businessId}`).emit('stats:invalidate');
      }
    } catch (e) {
      console.error('Socket emit (review delete) hatası:', e);
    }

    res.json({ message: 'Değerlendirme başarıyla silindi' });

  } catch (error) {
    console.error('Review silme hatası:', error);
    res.status(500).json({ error: 'Değerlendirme silinemedi' });
  }
});

module.exports = router;
