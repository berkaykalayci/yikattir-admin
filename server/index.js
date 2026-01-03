process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

app.use(cors({ origin: '*', methods: '*', allowedHeaders: '*' }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Veritabanı bağlantı testi
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Veritabanı bağlantı hatası:', err.stack);
  }
  console.log('Veritabanına başarıyla bağlanıldı.');
  release();
});

// Veritabanı tablolarını başlat
const initDB = async () => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS "Settings" (id SERIAL PRIMARY KEY, e_posta TEXT, theme TEXT DEFAULT \'Açık\')');
    await pool.query('ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS e_posta TEXT');
    console.log('Veritabanı tabloları hazır.');
  } catch (err) {
    console.error('DB başlatma hatası:', err.message);
  }
};
initDB();

// --- AUTH API ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Yetkisiz erişim' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) { 
    console.error('Giriş Hatası Detayı:', err); // Sunucu loguna yazar
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); // Tarayıcıya hata mesajını gönderir
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- YÖNETİM API'LERİ ---
app.patch('/api/businesses/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    await pool.query('UPDATE "Business" SET "isActive" = $1 WHERE id = $2', [isActive, id]);
    res.json({ message: 'Güncellendi' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "User" WHERE role = \'CUSTOMER\' ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/businesses', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT b.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email FROM "Business" b LEFT JOIN "User" u ON b."ownerId" = u.id ORDER BY b."createdAt" DESC');
    
    // Veriyi structured (owner nesnesi ile) hale getiriyoruz
    const formatted = result.rows.map(row => ({
      ...row,
      owner: {
        name: row.owner_name,
        phone: row.owner_phone,
        email: row.owner_email
      }
    }));
    
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.*, 
        u.name as customer_name, 
        b.name as business_name, 
        b.city, 
        b.district,
        s.name as service_name 
      FROM "Appointment" a 
      LEFT JOIN "User" u ON a."customerId" = u.id 
      LEFT JOIN "Business" b ON a."businessId" = b.id 
      LEFT JOIN "Service" s ON a."serviceId" = s.id 
      ORDER BY a."createdAt" DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { 
    console.error('Randevu hatası:', err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        r.*, 
        b.name as business_name, 
        b.city, 
        b.district,
        u.name as customer_name 
      FROM "Review" r 
      LEFT JOIN "Business" b ON r."businessId" = b.id 
      LEFT JOIN "Appointment" a ON r."appointmentId" = a.id 
      LEFT JOIN "User" u ON a."customerId" = u.id 
      ORDER BY r."createdAt" DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { 
    console.error('Yorum hatası:', err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const customerCount = await pool.query('SELECT COUNT(*) FROM "User" WHERE role = \'CUSTOMER\'');
    const businessCount = await pool.query('SELECT COUNT(*) FROM "Business"');
    const pendingBusinesses = await pool.query('SELECT COUNT(*) FROM "Business" WHERE "isActive" = false');
    const appointmentsMonth = await pool.query('SELECT COUNT(*) FROM "Appointment" WHERE "createdAt" > NOW() - INTERVAL \'1 month\'');
    const revenue = await pool.query('SELECT SUM("totalPrice") FROM "Appointment" WHERE status = \'COMPLETED\' AND "createdAt" > NOW() - INTERVAL \'1 month\'');
    
    const results = {
      totalCustomers: parseInt(customerCount.rows[0].count),
      totalBusinesses: parseInt(businessCount.rows[0].count),
      monthlyRevenue: parseFloat(revenue.rows[0].sum || 0),
      monthlyAppointments: parseInt(appointmentsMonth.rows[0].count),
      pendingBusinesses: parseInt(pendingBusinesses.rows[0].count)
    };

    console.log('Stats sorgu sonuçları:', results);
    res.json(results);
  } catch (err) {
    console.error('Stat Hatası:', err.message);
    res.json({ totalCustomers: 0, totalBusinesses: 0, monthlyRevenue: 0, monthlyAppointments: 0, pendingBusinesses: 0 });
  }
});

app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.*, 
        u.name as customer_name, 
        u.email as customer_email,
        u.phone as customer_phone,
        b.name as business_name,
        s.name as service_name
      FROM "Appointment" a 
      JOIN "User" u ON a."customerId" = u.id 
      JOIN "Business" b ON a."businessId" = b.id
      JOIN "Service" s ON a."serviceId" = s.id
      ORDER BY a."createdAt" DESC 
      LIMIT 5
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

// --- AYARLAR API (Kesin Çözüm) ---
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    // 1. Giriş yapan kullanıcının güncel bilgilerini veritabanından çek
    const userResult = await pool.query('SELECT email FROM "User" WHERE id = $1', [req.user.id]);
    const currentUserEmail = userResult.rows[0]?.email || 'E-posta bulunamadı';

    // 2. Ayarlar tablosundan tema vb. diğer bilgileri çek
    let result = await pool.query('SELECT * FROM "Settings" LIMIT 1');
    
    if (result.rows.length === 0) {
      await pool.query('INSERT INTO "Settings" (e_posta, theme) VALUES ($1, $2)', [currentUserEmail, 'Açık']);
      result = await pool.query('SELECT * FROM "Settings" LIMIT 1');
    }

    const settings = result.rows[0];
    res.json({
      contactEmail: currentUserEmail, // Her zaman veritabanındaki güncel admin mailini gönder
      theme: settings.theme
    });
  } catch (err) { 
    console.error('Settings hatası:', err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.patch('/api/settings', authenticateToken, async (req, res) => {
  const { contactEmail, theme } = req.body;
  try {
    await pool.query(
      'UPDATE "Settings" SET e_posta = $1, theme = $2 WHERE id = (SELECT id FROM "Settings" LIMIT 1)',
      [contactEmail, theme]
    );
    res.json({ message: 'Başarılı' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Şifre Değiştirme
app.post('/api/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.user.id;

  try {
    const result = await pool.query('SELECT password FROM "User" WHERE id = $1', [adminId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Mevcut şifre hatalı' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await pool.query('UPDATE "User" SET password = $1 WHERE id = $2', [hashedPassword, adminId]);
    
    res.json({ message: 'Şifre başarıyla güncellendi' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// İşletme Detaylarını (Randevular ve Yorumlar Dahil) Getir
app.get('/api/businesses/:id/details', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // 1. İşletme Temel Bilgileri
    const businessResult = await pool.query(
      'SELECT b.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email FROM "Business" b LEFT JOIN "User" u ON b."ownerId" = u.id WHERE b.id = $1',
      [id]
    );
    
    if (businessResult.rows.length === 0) return res.status(404).json({ error: 'İşletme bulunamadı' });
    
    const business = {
      ...businessResult.rows[0],
      owner: {
        name: businessResult.rows[0].owner_name,
        phone: businessResult.rows[0].owner_phone,
        email: businessResult.rows[0].owner_email
      }
    };
    
    // 2. İşletmeye Ait Randevular
    const appointmentsResult = await pool.query(
      'SELECT a.*, u.name as customer_name, s.name as service_name FROM "Appointment" a LEFT JOIN "User" u ON a."customerId" = u.id LEFT JOIN "Service" s ON a."serviceId" = s.id WHERE a."businessId" = $1 ORDER BY a."date" DESC, a."time" DESC',
      [id]
    );

    // 3. İşletmeye Ait Yorumlar
    const reviewsResult = await pool.query(
      'SELECT r.*, u.name as customer_name FROM "Review" r LEFT JOIN "Appointment" a ON r."appointmentId" = a.id LEFT JOIN "User" u ON a."customerId" = u.id WHERE r."businessId" = $1 ORDER BY r."createdAt" DESC',
      [id]
    );

    // 4. İşletmeye Ait Hizmetler
    const servicesResult = await pool.query(
      'SELECT * FROM "Service" WHERE "businessId" = $1 ORDER BY id ASC',
      [id]
    );

    res.json({
      business: business,
      appointments: appointmentsResult.rows.length > 0 ? appointmentsResult.rows : [],
      reviews: reviewsResult.rows.length > 0 ? reviewsResult.rows : [],
      services: servicesResult.rows.length > 0 ? servicesResult.rows : []
    });
  } catch (err) {
    console.error('Detay hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Yeni Admin Ekleme
app.post('/api/admin/create', authenticateToken, async (req, res) => {
  const { name, email, password } = req.body;
  
  // Sadece ADMIN olanlar yeni admin ekleyebilir (Zaten authenticateToken ve role check giriş kısmında yapılıyor)
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  try {
    // 1. E-posta kontrolü
    const checkUser = await pool.query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda' });
    }

    // 2. Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Admini kaydet
    await pool.query(
      'INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      ['admin_' + Date.now(), name, email, hashedPassword, 'ADMIN']
    );

    res.json({ message: 'Yeni yönetici başarıyla eklendi' });
  } catch (err) {
    console.error('Admin oluşturma hatası:', err.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Tüm Adminleri Getir
app.get('/api/admin/list', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  try {
    const result = await pool.query('SELECT id, name, email, "createdAt" FROM "User" WHERE role = \'ADMIN\' ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin Sil
app.delete('/api/admin/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  // Kendini silmeyi engelle
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
  }

  try {
    await pool.query('DELETE FROM "User" WHERE id = $1 AND role = \'ADMIN\'', [id]);
    res.json({ message: 'Yönetici başarıyla silindi' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin Güncelle
app.patch('/api/admin/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  try {
    // E-posta çakışma kontrolü (Kendi maili hariç)
    const checkEmail = await pool.query('SELECT id FROM "User" WHERE email = $1 AND id != $2', [email, id]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Bu e-posta adresi başka bir yönetici tarafından kullanılıyor' });
    }

    if (password) {
      // Şifre de güncellenecekse
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await pool.query(
        'UPDATE "User" SET name = $1, email = $2, password = $3, "updatedAt" = NOW() WHERE id = $4 AND role = \'ADMIN\'',
        [name, email, hashedPassword, id]
      );
    } else {
      // Sadece isim ve e-posta
      await pool.query(
        'UPDATE "User" SET name = $1, email = $2, "updatedAt" = NOW() WHERE id = $3 AND role = \'ADMIN\'',
        [name, email, id]
      );
    }

    res.json({ message: 'Yönetici bilgileri güncellendi' });
  } catch (err) {
    console.error('Admin güncelleme hatası:', err.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Randevu Tarih/Saat Güncelle
app.patch('/api/appointments/:id/datetime', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { date, time } = req.body;
  try {
    await pool.query(
      'UPDATE "Appointment" SET date = $1, time = $2, "updatedAt" = NOW() WHERE id = $3',
      [date, time, id]
    );
    res.json({ message: 'Randevu zamanı güncellendi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hizmet Güncelle
app.patch('/api/services/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, price, duration } = req.body;
  try {
    await pool.query(
      'UPDATE "Service" SET name = $1, price = $2, duration = $3, "updatedAt" = NOW() WHERE id = $4',
      [name, price, duration, id]
    );
    res.json({ message: 'Hizmet güncellendi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni Hizmet Ekle
app.post('/api/services', authenticateToken, async (req, res) => {
  const { businessId, name, price, duration } = req.body;
  try {
    const id = 'service_' + Date.now();
    await pool.query(
      'INSERT INTO "Service" (id, "businessId", name, price, duration, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [id, businessId, name, price, duration]
    );
    res.json({ message: 'Hizmet eklendi', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hizmet Sil
app.delete('/api/services/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM "Service" WHERE id = $1', [id]);
    res.json({ message: 'Hizmet silindi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kullanıcı Bilgilerini Güncelle (Müşteri & İşletme Sahibi)
app.patch('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password } = req.body;

  try {
    // E-posta çakışma kontrolü
    const checkEmail = await pool.query('SELECT id FROM "User" WHERE email = $1 AND id != $2', [email, id]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda' });
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await pool.query(
        'UPDATE "User" SET name = $1, email = $2, phone = $3, password = $4, "updatedAt" = NOW() WHERE id = $5',
        [name, email, phone, hashedPassword, id]
      );
    } else {
      await pool.query(
        'UPDATE "User" SET name = $1, email = $2, phone = $3, "updatedAt" = NOW() WHERE id = $4',
        [name, email, phone, id]
      );
    }

    res.json({ message: 'Kullanıcı bilgileri güncellendi' });
  } catch (err) {
    console.error('Kullanıcı güncelleme hatası:', err.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.listen(PORT, () => console.log(`Server http://localhost:${PORT} adresinde çalışıyor`));
