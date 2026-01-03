const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Randevu durumu değişikliklerinde bildirim oluşturur
 * @param {Object} params - Bildirim parametreleri
 * @param {string} params.appointmentId - Randevu ID
 * @param {string} params.customerId - Müşteri ID
 * @param {string} params.businessId - İşletme ID
 * @param {string} params.oldStatus - Eski durum
 * @param {string} params.newStatus - Yeni durum
 * @param {Object} params.appointmentData - Randevu verileri (date, time, business, service)
 * @param {Object} io - Socket.IO instance (opsiyonel)
 */
async function createAppointmentStatusNotification({
  appointmentId,
  customerId,
  businessId,
  oldStatus,
  newStatus,
  appointmentData = {},
  io = null
}) {
  try {
    // Bildirim mesajı ve başlığını duruma göre belirle
    const { title, message } = getNotificationContent(newStatus, appointmentData);

    // Veritabanına bildirim kaydet
    const notification = await prisma.notification.create({
      data: {
        userId: customerId,
        type: 'appointment',
        title,
        message,
      }
    });

    // Socket.IO ile gerçek zamanlı bildirim gönder
    if (io) {
      io.to(`customer:${customerId}`).emit('notification:new', notification);
    }

    console.log(`Bildirim oluşturuldu: ${title} - Müşteri: ${customerId}`);
    return notification;
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
    throw error;
  }
}

/**
 * Randevu durumuna göre bildirim içeriği oluşturur
 * @param {string} status - Randevu durumu
 * @param {Object} appointmentData - Randevu verileri
 * @returns {Object} { title, message }
 */
function getNotificationContent(status, appointmentData = {}) {
  const businessName = appointmentData.business?.name || appointmentData.businessName || 'İşletme';
  const serviceName = appointmentData.service?.name || appointmentData.serviceName || 'Hizmet';
  const date = appointmentData.date ? formatDate(appointmentData.date) : '';
  const time = appointmentData.time || '';

  switch (status) {
    case 'PENDING':
      return {
        title: 'Randevu Talebi Alındı',
        message: `${businessName} işletmesine ${serviceName} hizmeti için randevu talebiniz alındı. Onay bekleniyor.`
      };

    case 'CONFIRMED':
      return {
        title: 'Randevu Onaylandı ✓',
        message: `${businessName} işletmesine ${date} ${time} tarihindeki randevunuz onaylandı.`
      };

    case 'CANCELLED':
      return {
        title: 'Randevu İptal Edildi',
        message: `${businessName} işletmesine ${date} ${time} tarihindeki randevunuz iptal edildi.`
      };

    case 'COMPLETED':
      return {
        title: 'Randevu Tamamlandı',
        message: `${businessName} işletmesindeki randevunuz tamamlandı. Hizmeti değerlendirmek ister misiniz?`
      };

    case 'REJECTED':
      return {
        title: 'Randevu Reddedildi',
        message: `${businessName} işletmesine ${date} ${time} tarihindeki randevu talebiniz reddedildi.`
      };

    default:
      return {
        title: 'Randevu Durumu Güncellendi',
        message: `${businessName} işletmesindeki randevunuzun durumu güncellendi.`
      };
  }
}

/**
 * Tarihi Türkçe formata çevirir
 * @param {string|Date} date - Tarih
 * @returns {string} Formatlanmış tarih
 */
function formatDate(date) {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    return '';
  }
}

/**
 * Randevu hatırlatma bildirimi oluşturur (randevudan 2 saat önce)
 * @param {Object} params - Bildirim parametreleri
 * @param {string} params.customerId - Müşteri ID
 * @param {Object} params.appointmentData - Randevu verileri
 * @param {Object} io - Socket.IO instance (opsiyonel)
 */
async function createAppointmentReminderNotification({
  customerId,
  appointmentData = {},
  io = null
}) {
  try {
    const businessName = appointmentData.business?.name || appointmentData.businessName || 'İşletme';
    const serviceName = appointmentData.service?.name || appointmentData.serviceName || 'Hizmet';
    const date = appointmentData.date ? formatDate(appointmentData.date) : '';
    const time = appointmentData.time || '';

    const notification = await prisma.notification.create({
      data: {
        userId: customerId,
        type: 'appointment',
        title: 'Randevu Hatırlatması',
        message: `${businessName} işletmesine ${date} ${time} tarihindeki ${serviceName} randevunuz 2 saat sonra başlayacak.`
      }
    });

    if (io) {
      io.to(`customer:${customerId}`).emit('notification:new', notification);
    }

    return notification;
  } catch (error) {
    console.error('Hatırlatma bildirimi oluşturma hatası:', error);
    throw error;
  }
}

module.exports = {
  createAppointmentStatusNotification,
  createAppointmentReminderNotification,
  getNotificationContent
};

