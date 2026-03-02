const db = require('../config/db');

// GET /api/servicios/:barbero_id
const getServicios = async (req, res) => {
  const { barbero_id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM servicios WHERE usuario_id = ? AND estado = "activo"',
      [barbero_id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
};

// POST /api/servicios
const createServicio = async (req, res) => {
  const { nombre, descripcion, precio, duracion_minutos } = req.body;
  const usuario_id = req.user.id;

  try {
    const [result] = await db.query(
      'INSERT INTO servicios (usuario_id, nombre, descripcion, precio, duracion_minutos) VALUES (?, ?, ?, ?, ?)',
      [usuario_id, nombre, descripcion || null, precio, duracion_minutos || 30]
    );
    res.status(201).json({ message: 'Servicio creado', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear servicio' });
  }
};

// PUT /api/servicios/:id
const updateServicio = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, duracion_minutos, estado } = req.body;

  try {
    await db.query(
      'UPDATE servicios SET nombre = ?, descripcion = ?, precio = ?, duracion_minutos = ?, estado = ? WHERE id = ? AND usuario_id = ?',
      [nombre, descripcion, precio, duracion_minutos, estado, id, req.user.id]
    );
    res.json({ message: 'Servicio actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
};

// DELETE /api/servicios/:id
const deleteServicio = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE servicios SET estado = "inactivo" WHERE id = ? AND usuario_id = ?',
      [id, req.user.id]);
    res.json({ message: 'Servicio eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
};

module.exports = { getServicios, createServicio, updateServicio, deleteServicio };
