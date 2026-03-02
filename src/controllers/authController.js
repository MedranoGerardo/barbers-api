const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// POST /api/auth/register
const register = async (req, res) => {
  const { nombre, apellido, correo, password, rol = 'cliente', telefono } = req.body;

  if (!nombre || !apellido || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Verificar si el correo ya existe
    const [existing] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, apellido, correo, telefono, password, rol, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
      [nombre, apellido, correo, telefono || null, hashedPassword, rol]
    );

    // Generar token
    const token = jwt.sign(
      { id: result.insertId, correo, rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: { id: result.insertId, nombre, apellido, correo, rol }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }

  try {
    const [users] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const user = users[0];

    if (user.estado !== 'activo') {
      return res.status(403).json({ error: 'Tu cuenta está suspendida o inactiva' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user.id, correo: user.correo, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.correo,
        rol: user.rol,
        foto_perfil: user.foto_perfil
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// POST /api/auth/check-email
const checkEmail = async (req, res) => {
  const { correo } = req.body;
  try {
    const [rows] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    res.json({ exists: rows.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar correo' });
  }
};

module.exports = { register, login, checkEmail };
