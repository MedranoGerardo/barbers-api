const express = require('express');
const router  = express.Router();

const {
  getHorario,
  upsertHorario,
  getDescansos,
  addDescansos,
  removeDescanso,
  getBloqueos,
  addBloqueo,
  removeBloqueo,
  getDisponibilidad,
} = require('../controllers/horariosController');

const { authMiddleware } = require('../middleware/auth');

const esBarbero = (req, res, next) => {
  if (req.user.rol !== 'barbero') {
    return res.status(403).json({ error: 'Solo los barberos pueden realizar esta acción' });
  }
  next();
};

// ── Públicas ──────────────────────────────────────────────────
router.get('/:barbero_id',                getHorario);
router.get('/:barbero_id/descansos',      getDescansos);
router.get('/:barbero_id/bloqueos',       getBloqueos);
router.get('/:barbero_id/disponibilidad', getDisponibilidad);

// ── Solo barbero autenticado ──────────────────────────────────
router.put('/',                 authMiddleware, esBarbero, upsertHorario);
router.post('/descansos',       authMiddleware, esBarbero, addDescansos);
router.delete('/descansos/:id', authMiddleware, esBarbero, removeDescanso);
router.post('/bloqueos',        authMiddleware, esBarbero, addBloqueo);
router.delete('/bloqueos/:id',  authMiddleware, esBarbero, removeBloqueo);

module.exports = router;