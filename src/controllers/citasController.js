const db = require('../config/db');

// GET /api/citas - Obtener citas del usuario autenticado
const getCitas = async (req, res) => {
  const { rol, id } = req.user;

  try {
    let query, params;

    if (rol === 'cliente') {
      query = `
        SELECT c.*, 
          u.nombre AS barbero_nombre, u.apellido AS barbero_apellido,
          u.foto_perfil AS barbero_avatar, u.nombre_barberia,
          s.nombre AS servicio_nombre
        FROM citas c
        JOIN usuarios u ON c.barbero_id = u.id
        JOIN servicios s ON c.servicio_id = s.id
        WHERE c.cliente_id = ?
        ORDER BY c.fecha DESC, c.hora DESC`;
      params = [id];
    } else {
      query = `
        SELECT c.*,
          u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
          u.foto_perfil AS cliente_avatar, u.telefono AS cliente_telefono,
          s.nombre AS servicio_nombre
        FROM citas c
        JOIN usuarios u ON c.cliente_id = u.id
        JOIN servicios s ON c.servicio_id = s.id
        WHERE c.barbero_id = ?
        ORDER BY c.fecha DESC, c.hora DESC`;
      params = [id];
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener citas' });
  }
};

// POST /api/citas - Crear nueva cita
const createCita = async (req, res) => {
  const { barbero_id, servicio_id, fecha, hora, nota_cliente } = req.body;
  const cliente_id = req.user.id;

  if (!barbero_id || !servicio_id || !fecha || !hora) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // Obtener precio del servicio
    const [servicios] = await db.query('SELECT precio FROM servicios WHERE id = ?', [servicio_id]);
    if (servicios.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });

    const precio = servicios[0].precio;

    // Verificar si el cliente ya tiene cita con ese barbero en esa fecha/hora
    const [conflict] = await db.query(
      `SELECT id FROM citas WHERE barbero_id = ? AND fecha = ? AND hora = ? AND status NOT IN ('cancelled')`,
      [barbero_id, fecha, hora]
    );
    if (conflict.length > 0) {
      return res.status(409).json({ error: 'El barbero ya tiene una cita en ese horario' });
    }

    // Verificar si es cliente nuevo
    const [prevCitas] = await db.query(
      'SELECT id FROM citas WHERE cliente_id = ? AND barbero_id = ?',
      [cliente_id, barbero_id]
    );
    const es_cliente_nuevo = prevCitas.length === 0 ? 1 : 0;

    const [result] = await db.query(
      `INSERT INTO citas (cliente_id, barbero_id, servicio_id, fecha, hora, precio, nota_cliente, es_cliente_nuevo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cliente_id, barbero_id, servicio_id, fecha, hora, precio, nota_cliente || null, es_cliente_nuevo]
    );

    res.status(201).json({ message: 'Cita creada exitosamente', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cita' });
  }
};

// PUT /api/citas/:id/status - Cambiar status de cita (barbero)
const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  try {
    await db.query('UPDATE citas SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Status actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar status' });
  }
};

// PUT /api/citas/:id/reagendar
const reagendar = async (req, res) => {
  const { id } = req.params;
  const { fecha, hora } = req.body;

  try {
    await db.query('UPDATE citas SET fecha = ?, hora = ? WHERE id = ?', [fecha, hora, id]);
    res.json({ message: 'Cita reagendada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al reagendar cita' });
  }
};

module.exports = { getCitas, createCita, updateStatus, reagendar };
