const db = require('../config/db');

// POST /api/calificaciones - Calificar un servicio
const createCalificacion = async (req, res) => {
  const { cita_id, puntuacion, comentario } = req.body;
  const cliente_id = req.user.id;

  if (!cita_id || !puntuacion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // Obtener datos de la cita
    const [citas] = await db.query(
      'SELECT * FROM citas WHERE id = ? AND cliente_id = ? AND status = "completed"',
      [cita_id, cliente_id]
    );
    if (citas.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada o no completada' });
    }

    const cita = citas[0];

    await db.query(
      'INSERT INTO calificaciones (cita_id, cliente_id, barbero_id, puntuacion, comentario) VALUES (?, ?, ?, ?, ?)',
      [cita_id, cliente_id, cita.barbero_id, puntuacion, comentario || null]
    );

    // Actualizar rating promedio del barbero
    await db.query(
      `UPDATE usuarios SET rating_promedio = (
        SELECT AVG(puntuacion) FROM calificaciones WHERE barbero_id = ?
      ) WHERE id = ?`,
      [cita.barbero_id, cita.barbero_id]
    );

    res.status(201).json({ message: 'Calificación enviada' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya calificaste esta cita' });
    }
    res.status(500).json({ error: 'Error al enviar calificación' });
  }
};

// GET /api/favoritos - Obtener barberos favoritos del cliente
const getFavoritos = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.apellido, u.foto_perfil, u.nombre_barberia, u.rating_promedio
       FROM favoritos f
       JOIN usuarios u ON f.barbero_id = u.id
       WHERE f.cliente_id = ?`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
};

// POST /api/favoritos
const addFavorito = async (req, res) => {
  const { barbero_id } = req.body;
  try {
    await db.query(
      'INSERT INTO favoritos (cliente_id, barbero_id) VALUES (?, ?)',
      [req.user.id, barbero_id]
    );
    res.status(201).json({ message: 'Barbero agregado a favoritos' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya está en favoritos' });
    }
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
};

// DELETE /api/favoritos/:barbero_id
const removeFavorito = async (req, res) => {
  const { barbero_id } = req.params;
  try {
    await db.query(
      'DELETE FROM favoritos WHERE cliente_id = ? AND barbero_id = ?',
      [req.user.id, barbero_id]
    );
    res.json({ message: 'Barbero eliminado de favoritos' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
};

module.exports = { createCalificacion, getFavoritos, addFavorito, removeFavorito };
