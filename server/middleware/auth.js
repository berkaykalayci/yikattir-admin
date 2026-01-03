const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth Middleware - URL:', req.url);
  console.log('Auth Middleware - Authorization Header:', authHeader);
  console.log('Auth Middleware - Token:', token ? 'Var' : 'Yok');

  if (!token) {
    console.log('Auth Middleware - 401: Token gerekli');
    return res.status(401).json({ error: 'Token gerekli' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Auth Middleware - 403: Geçersiz token', err.message);
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    console.log('Auth Middleware - Başarılı, User ID:', user.userId);
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
