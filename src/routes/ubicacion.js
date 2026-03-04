const express = require('express');
const router  = express.Router();

const {
  getUbicacion,
  upsertUbicacion,
  deleteUbicacion,
  getBarberosCerca,
} = require('../controllers/ubicacionController');

const { authMiddleware } = require('../middleware/auth');

const esBarbero = (req, res, next) => {
  if (req.user.rol !== 'barbero') {
    return res.status(403).json({ error: 'Solo los barberos pueden realizar esta acción' });
  }
  next();
};

// ── Públicas ──────────────────────────────────────────────────
router.get('/cerca',          getBarberosCerca);   // ?lat=&lng=&radio=
router.get('/:barbero_id',    getUbicacion);

// ── Solo barbero autenticado ──────────────────────────────────
router.put('/',       authMiddleware, esBarbero, upsertUbicacion);
router.delete('/',    authMiddleware, esBarbero, deleteUbicacion);

module.exports = router;