const db = require('../config/db');

// GET /api/usuarios/perfil
const getPerfil = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, apellido, correo, telefono, rol, foto_perfil,
              fecha_registro, nombre_barberia, rating_promedio, total_cortes, total_clientes
       FROM usuarios WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// PUT /api/usuarios/perfil
const updatePerfil = async (req, res) => {
  const { nombre, apellido, telefono, foto_perfil, nombre_barberia } = req.body;

  try {
    await db.query(
      `UPDATE usuarios SET nombre = ?, apellido = ?, telefono = ?, foto_perfil = ?, nombre_barberia = ?
       WHERE id = ?`,
      [nombre, apellido, telefono, foto_perfil, nombre_barberia, req.user.id]
    );

    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

// GET /api/usuarios/barberos
const getBarberos = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, apellido, foto_perfil, nombre_barberia, rating_promedio, total_cortes
       FROM usuarios WHERE rol = 'barbero' AND estado = 'activo'`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener barberos' });
  }
};

module.exports = { getPerfil, updatePerfil, getBarberos };
