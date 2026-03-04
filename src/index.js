const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes      = require('./routes/auth');
const usuariosRoutes  = require('./routes/usuarios');
const apiRoutes       = require('./routes/api');
const horariosRoutes  = require('./routes/horarios');   // ← nuevo
const ubicacionRoutes = require('./routes/ubicacion');  // ← nuevo

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth',      authRoutes);
app.use('/api/usuarios',  usuariosRoutes);
app.use('/api/horarios',  horariosRoutes);   // ← nuevo
app.use('/api/ubicacion', ubicacionRoutes);  // ← nuevo
app.use('/api',           apiRoutes);        // debe ir al final para no pisar las rutas anteriores

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: '✅ Barbers API funcionando correctamente' });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});