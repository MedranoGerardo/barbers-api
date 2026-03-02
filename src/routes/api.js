const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

const { getCitas, createCita, updateStatus, reagendar } = require('../controllers/citasController');
const { getProductos, createProducto, updateProducto, deleteProducto, crearOrden } = require('../controllers/productosController');
const { getServicios, createServicio, updateServicio, deleteServicio } = require('../controllers/serviciosController');
const { createCalificacion, getFavoritos, addFavorito, removeFavorito } = require('../controllers/extraController');

// CITAS
router.get('/citas', authMiddleware, getCitas);
router.post('/citas', authMiddleware, createCita);
router.put('/citas/:id/status', authMiddleware, updateStatus);
router.put('/citas/:id/reagendar', authMiddleware, reagendar);

// PRODUCTOS
router.get('/productos', getProductos);
router.post('/productos', authMiddleware, createProducto);
router.put('/productos/:id', authMiddleware, updateProducto);
router.delete('/productos/:id', authMiddleware, deleteProducto);
router.post('/productos/orden', authMiddleware, crearOrden);

// SERVICIOS
router.get('/servicios/:barbero_id', getServicios);
router.post('/servicios', authMiddleware, createServicio);
router.put('/servicios/:id', authMiddleware, updateServicio);
router.delete('/servicios/:id', authMiddleware, deleteServicio);

// CALIFICACIONES
router.post('/calificaciones', authMiddleware, createCalificacion);

// FAVORITOS
router.get('/favoritos', authMiddleware, getFavoritos);
router.post('/favoritos', authMiddleware, addFavorito);
router.delete('/favoritos/:barbero_id', authMiddleware, removeFavorito);

module.exports = router;
