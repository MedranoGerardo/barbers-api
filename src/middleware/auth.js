const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar rol de barbero
const isBarber = (req, res, next) => {
  if (req.user.rol !== 'barbero' && req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo barberos.' });
  }
  next();
};

// Middleware para verificar rol de admin
const isAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
};

module.exports = { authMiddleware, isBarber, isAdmin };
