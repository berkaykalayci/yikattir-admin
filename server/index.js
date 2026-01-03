process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// --- MOBİL ROTA İTHALATLARI ---
const businessesRouter = require('./routes/businesses');
const appointmentsRouter = require('./routes/appointments');
const notificationsRouter = require('./routes/notifications');
const usersRouter = require('./routes/users');
const favoritesRouter = require('./routes/favorites');
const servicesRouter = require('./routes/services');
const reviewsRouter = require('./routes/reviews');
const addressesRouter = require('./routes/addresses');
const paymentMethodsRouter = require('./routes/paymentMethods');
const blockedSlotsRouter = require('./routes/blockedSlots');
const { router: authRouter } = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3001; 
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

app.use(cors({ origin: '*', methods: '*', allowedHeaders: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Postgres Pool (Admin Paneli Sorguları İçin)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Veritabanı Tablo Hazırlığı
const initDB = async () => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS "Settings" (id SERIAL PRIMARY KEY, e_posta TEXT, theme TEXT DEFAULT \'Açık\')');
    console.log('Admin DB hazır.');
  } catch (err) { console.error('DB hatası:', err.message); }
};
initDB();

// --- MOBİL ROTA YÜKLEYİCİ (Güvenli) ---
const loadRoutes = () => {
  console.log('Routes yükleniyor...');
  try {
    const fs = require('fs');
    if (fs.existsSync(path.join(__dirname, 'routes'))) {
      app.use('/auth', require('./routes/auth').router || require('./routes/auth'));
      app.use('/businesses', require('./routes/businesses'));
      app.use('/appointments', require('./routes/appointments'));
      app.use('/notifications', require('./routes/notifications'));
      app.use('/users', require('./routes/users'));
      app.use('/favorites', require('./routes/favorites'));
      app.use('/services', require('./routes/services'));
      app.use('/reviews', require('./routes/reviews'));
      app.use('/addresses', require('./routes/addresses'));
      app.use('/payment-methods', require('./routes/paymentMethods'));
      app.use('/blocked-slots', require('./routes/blockedSlots'));
      console.log('Tüm routes yüklendi');
    } else {
      console.error('UYARI: "routes" klasörü bulunamadı. Mobil API pasif.');
    }
  } catch (err) {
    console.error('Route yükleme hatası:', err.message);
  }
};
loadRoutes();

// --- ADMIN PANEL MIDDLEWARE ---
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

// --- ADMIN PANEL API ROTALARI ---

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Hatalı giriş' });
    if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Hatalı giriş' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Dashboard İstatistikleri
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const customers = await pool.query('SELECT COUNT(*) FROM "User" WHERE role = \'CUSTOMER\'');
    const businesses = await pool.query('SELECT COUNT(*) FROM "Business"');
    const pending = await pool.query('SELECT COUNT(*) FROM "Business" WHERE "isActive" = false');
    const appMonth = await pool.query('SELECT COUNT(*) FROM "Appointment" WHERE "createdAt" > NOW() - INTERVAL \'1 month\'');
    const revenue = await pool.query('SELECT SUM("totalPrice") FROM "Appointment" WHERE status = \'COMPLETED\' AND "createdAt" > NOW() - INTERVAL \'1 month\'');
    
    res.json({
      totalCustomers: parseInt(customers.rows[0].count),
      totalBusinesses: parseInt(businesses.rows[0].count),
      monthlyRevenue: parseFloat(revenue.rows[0].sum || 0),
      monthlyAppointments: parseInt(appMonth.rows[0].count),
      pendingBusinesses: parseInt(pending.rows[0].count)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Son İşlemler (Dashboard Table)
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT a.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone, 
             b.name as business_name, s.name as service_name
      FROM "Appointment" a 
      JOIN "User" u ON a."customerId" = u.id 
      JOIN "Business" b ON a."businessId" = b.id
      JOIN "Service" s ON a."serviceId" = s.id
      ORDER BY a."createdAt" DESC LIMIT 5
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.json([]); }
});

// İşletme Listesi
app.get('/api/businesses', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT b.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email FROM "Business" b LEFT JOIN "User" u ON b."ownerId" = u.id ORDER BY b."createdAt" DESC');
    res.json(result.rows.map(row => ({ ...row, owner: { name: row.owner_name, phone: row.owner_phone, email: row.owner_email } })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// İşletme Detayları
app.get('/api/businesses/:id/details', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const business = await pool.query('SELECT b.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email FROM "Business" b LEFT JOIN "User" u ON b."ownerId" = u.id WHERE b.id = $1', [id]);
    const appointments = await pool.query('SELECT a.*, u.name as customer_name, s.name as service_name FROM "Appointment" a LEFT JOIN "User" u ON a."customerId" = u.id LEFT JOIN "Service" s ON a."serviceId" = s.id WHERE a."businessId" = $1 ORDER BY a.date DESC', [id]);
    const reviews = await pool.query('SELECT r.*, u.name as customer_name FROM "Review" r LEFT JOIN "Appointment" a ON r."appointmentId" = a.id LEFT JOIN "User" u ON a."customerId" = u.id WHERE r."businessId" = $1', [id]);
    const services = await pool.query('SELECT * FROM "Service" WHERE "businessId" = $1', [id]);
    res.json({ business: { ...business.rows[0], owner: { name: business.rows[0].owner_name, phone: business.rows[0].owner_phone, email: business.rows[0].owner_email } }, appointments: appointments.rows, reviews: reviews.rows, services: services.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Gelir Analizi (Haftalık, Aylık, Yıllık)
app.get('/api/businesses/:id/revenue', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Haftalık (Son 7 gün, gün bazlı)
    const weekly = await pool.query(`
      SELECT TO_CHAR(date, 'DD/MM') as label, SUM("totalPrice")::float as value
      FROM "Appointment"
      WHERE "businessId" = $1 AND status = 'COMPLETED' AND date > NOW() - INTERVAL '7 days'
      GROUP BY label, date ORDER BY date ASC
    `, [id]);

    // Aylık (Son 30 gün, gün bazlı)
    const monthly = await pool.query(`
      SELECT TO_CHAR(date, 'DD/MM') as label, SUM("totalPrice")::float as value
      FROM "Appointment"
      WHERE "businessId" = $1 AND status = 'COMPLETED' AND date > NOW() - INTERVAL '30 days'
      GROUP BY label, date ORDER BY date ASC
    `, [id]);

    // Yıllık (Son 12 ay, ay bazlı)
    const yearly = await pool.query(`
      SELECT TO_CHAR(date, 'YYYY-MM') as label, SUM("totalPrice")::float as value
      FROM "Appointment"
      WHERE "businessId" = $1 AND status = 'COMPLETED' AND date > NOW() - INTERVAL '1 year'
      GROUP BY label ORDER BY MIN(date) ASC
    `, [id]);

    res.json({ weekly: weekly.rows, monthly: monthly.rows, yearly: yearly.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// İşletme Durum Güncelle
app.patch('/api/businesses/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params; const { isActive } = req.body;
  await pool.query('UPDATE "Business" SET "isActive" = $1 WHERE id = $2', [isActive, id]);
  res.json({ message: 'Güncellendi' });
});

// Randevular Listesi
app.get('/api/appointments', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT a.*, u.name as customer_name, b.name as business_name, b.city, b.district, s.name as service_name FROM "Appointment" a LEFT JOIN "User" u ON a."customerId" = u.id LEFT JOIN "Business" b ON a."businessId" = b.id LEFT JOIN "Service" s ON a."serviceId" = s.id ORDER BY a."createdAt" DESC');
  res.json(result.rows);
});

// Randevu Durum/Tarih Güncelle
app.patch('/api/appointments/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params; const { status } = req.body;
  await pool.query('UPDATE "Appointment" SET status = $1, "updatedAt" = NOW() WHERE id = $2', [status, id]);
  res.json({ message: 'Güncellendi' });
});

app.patch('/api/appointments/:id/datetime', authenticateToken, async (req, res) => {
  const { id } = req.params; const { date, time } = req.body;
  await pool.query('UPDATE "Appointment" SET date = $1, time = $2, "updatedAt" = NOW() WHERE id = $3', [date, time, id]);
  res.json({ message: 'Başarılı' });
});

// Yorumlar Listesi
app.get('/api/reviews', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT r.*, b.name as business_name, b.city, b.district, u.name as customer_name FROM "Review" r LEFT JOIN "Business" b ON r."businessId" = b.id LEFT JOIN "Appointment" a ON r."appointmentId" = a.id LEFT JOIN "User" u ON a."customerId" = u.id ORDER BY r."createdAt" DESC');
  res.json(result.rows);
});

// Kullanıcı Yönetimi
app.get('/api/users', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT * FROM "User" WHERE role = \'CUSTOMER\' ORDER BY "createdAt" DESC');
  res.json(result.rows);
});

app.patch('/api/users/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params; const { role } = req.body;
  await pool.query('UPDATE "User" SET role = $1, "updatedAt" = NOW() WHERE id = $2', [role, id]);
  res.json({ message: 'Güncellendi' });
});

app.patch('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params; const { name, email, phone, password } = req.body;
  if (password) {
    const salt = await bcrypt.genSalt(10); const hashed = await bcrypt.hash(password, salt);
    await pool.query('UPDATE "User" SET name=$1, email=$2, phone=$3, password=$4, "updatedAt"=NOW() WHERE id=$5', [name, email, phone, hashed, id]);
  } else {
    await pool.query('UPDATE "User" SET name=$1, email=$2, phone=$3, "updatedAt"=NOW() WHERE id=$4', [name, email, phone, id]);
  }
  res.json({ message: 'Güncellendi' });
});

// Servis Yönetimi
app.post('/api/services', authenticateToken, async (req, res) => {
  const { businessId, name, price, duration } = req.body;
  const id = 'service_' + Date.now();
  await pool.query('INSERT INTO "Service" (id, "businessId", name, price, duration, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())', [id, businessId, name, price, duration]);
  res.json({ id });
});

app.patch('/api/services/:id', authenticateToken, async (req, res) => {
  const { id } = req.params; const { name, price, duration } = req.body;
  await pool.query('UPDATE "Service" SET name = $1, price = $2, duration = $3, "updatedAt" = NOW() WHERE id = $4', [name, price, duration, id]);
  res.json({ message: 'Başarılı' });
});

app.delete('/api/services/:id', authenticateToken, async (req, res) => {
  await pool.query('DELETE FROM "Service" WHERE id = $1', [req.params.id]);
  res.json({ message: 'Silindi' });
});

// Ayarlar & Şifre
app.get('/api/settings', authenticateToken, async (req, res) => {
  const user = await pool.query('SELECT email FROM "User" WHERE id = $1', [req.user.id]);
  res.json({ contactEmail: user.rows[0].email, theme: 'Açık' });
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await pool.query('SELECT password FROM "User" WHERE id = $1', [req.user.id]);
  const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
  if (!isMatch) return res.status(400).json({ error: 'Mevcut şifre hatalı' });
  const salt = await bcrypt.genSalt(10); const hashed = await bcrypt.hash(newPassword, salt);
  await pool.query('UPDATE "User" SET password = $1 WHERE id = $2', [hashed, req.user.id]);
  res.json({ message: 'Başarılı' });
});

// Admin Yönetimi
app.get('/api/admin/list', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, "createdAt" FROM "User" WHERE role = \'ADMIN\'');
  res.json(result.rows);
});

app.post('/api/admin/create', authenticateToken, async (req, res) => {
  const { name, email, password } = req.body;
  const salt = await bcrypt.genSalt(10); const hashed = await bcrypt.hash(password, salt);
  await pool.query('INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, \'ADMIN\', NOW(), NOW())', ['admin_' + Date.now(), name, email, hashed]);
  res.json({ message: 'Admin eklendi' });
});

app.patch('/api/admin/:id', authenticateToken, async (req, res) => {
  const { id } = req.params; const { name, email, password } = req.body;
  if (password) {
    const salt = await bcrypt.genSalt(10); const hashed = await bcrypt.hash(password, salt);
    await pool.query('UPDATE "User" SET name=$1, email=$2, password=$3, "updatedAt"=NOW() WHERE id=$4', [name, email, hashed, id]);
  } else {
    await pool.query('UPDATE "User" SET name=$1, email=$2, "updatedAt"=NOW() WHERE id=$3', [name, email, id]);
  }
  res.json({ message: 'Güncellendi' });
});

app.delete('/api/admin/:id', authenticateToken, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Kendinizi silemezsiniz' });
  await pool.query('DELETE FROM "User" WHERE id = $1 AND role = \'ADMIN\'', [req.params.id]);
  res.json({ message: 'Silindi' });
});

// --- SOCKET.IO AYARLARI (Mobil Odalar Dahil) ---
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('join:business', (id) => socket.join(`business:${id}`));
  socket.on('join:customer', (id) => socket.join(`customer:${id}`));
  socket.on('join:city', (city) => { if(city) socket.join(`city:${city.toLowerCase()}`); });
  socket.on('disconnect', () => console.log('Socket disconnected'));
});

app.set('io', io);

// --- SUNUCU BAŞLATMA ---
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu port ${PORT} üzerinde hem Mobil hem Admin için çalışıyor`);
});