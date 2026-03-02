const express = require('express');
const router = express.Router();
const { getPerfil, updatePerfil, getBarberos } = require('../controllers/usuariosController');
const { authMiddleware } = require('../middleware/auth');

router.get('/perfil', authMiddleware, getPerfil);
router.put('/perfil', authMiddleware, updatePerfil);
router.get('/barberos', getBarberos);

module.exports = router;
