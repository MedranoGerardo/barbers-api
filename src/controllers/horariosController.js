const db = require('../config/db');

// ================================================================
// HORARIO SEMANAL
// ================================================================

/**
 * GET /api/horarios/:barbero_id
 * Retorna los 7 días de la semana con su horario.
 * Público — cualquiera puede consultarlo para saber cuándo está disponible.
 */
const getHorario = async (req, res) => {
  const { barbero_id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT id, dia_semana, hora_inicio, hora_fin, activo
       FROM horarios
       WHERE barbero_id = ?
       ORDER BY dia_semana ASC`,
      [barbero_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener horario' });
  }
};

/**
 * PUT /api/horarios
 * El barbero crea o reemplaza su horario completo.
 * Body esperado:
 * {
 *   "horarios": [
 *     { "dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "18:00", "activo": true },
 *     { "dia_semana": 2, "hora_inicio": "08:00", "hora_fin": "18:00", "activo": true },
 *     { "dia_semana": 0, "hora_inicio": "08:00", "hora_fin": "12:00", "activo": false }
 *     ... (pueden venir de 1 a 7 entradas)
 *   ]
 * }
 */
const upsertHorario = async (req, res) => {
  const barbero_id = req.user.id;
  const { horarios } = req.body;

  if (!Array.isArray(horarios) || horarios.length === 0) {
    return res.status(400).json({ error: 'Se requiere un arreglo de horarios' });
  }

  // Validar cada entrada
  for (const h of horarios) {
    if (h.dia_semana === undefined || h.dia_semana < 0 || h.dia_semana > 6) {
      return res.status(400).json({ error: `dia_semana inválido: ${h.dia_semana}` });
    }
    if (!h.hora_inicio || !h.hora_fin) {
      return res.status(400).json({ error: 'hora_inicio y hora_fin son obligatorios' });
    }
    if (h.hora_fin <= h.hora_inicio) {
      return res.status(400).json({ error: 'hora_fin debe ser mayor que hora_inicio' });
    }
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    for (const h of horarios) {
      await conn.query(
        `INSERT INTO horarios (barbero_id, dia_semana, hora_inicio, hora_fin, activo)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           hora_inicio = VALUES(hora_inicio),
           hora_fin    = VALUES(hora_fin),
           activo      = VALUES(activo)`,
        [barbero_id, h.dia_semana, h.hora_inicio, h.hora_fin, h.activo ? 1 : 0]
      );
    }

    await conn.commit();
    res.json({ message: 'Horario guardado correctamente' });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: 'Error al guardar horario' });
  } finally {
    conn.release();
  }
};

// ================================================================
// DÍAS DE DESCANSO / ASUETO
// ================================================================

/**
 * GET /api/horarios/:barbero_id/descansos
 * Lista los días de descanso (a partir de hoy por defecto).
 * Query param: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 */
const getDescansos = async (req, res) => {
  const { barbero_id } = req.params;
  const { desde, hasta } = req.query;

  try {
    let query = `SELECT id, fecha, motivo FROM dias_descanso WHERE barbero_id = ?`;
    const params = [barbero_id];

    if (desde) { query += ' AND fecha >= ?'; params.push(desde); }
    if (hasta) { query += ' AND fecha <= ?'; params.push(hasta); }

    query += ' ORDER BY fecha ASC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener días de descanso' });
  }
};

/**
 * POST /api/horarios/descansos
 * El barbero agrega uno o varios días de descanso.
 * Body: { "fechas": ["2025-12-25", "2025-12-31"], "motivo": "Navidad / Año Nuevo" }
 */
const addDescansos = async (req, res) => {
  const barbero_id = req.user.id;
  const { fechas, motivo } = req.body;

  if (!Array.isArray(fechas) || fechas.length === 0) {
    return res.status(400).json({ error: 'Se requiere un arreglo de fechas' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    for (const fecha of fechas) {
      await conn.query(
        `INSERT IGNORE INTO dias_descanso (barbero_id, fecha, motivo)
         VALUES (?, ?, ?)`,
        [barbero_id, fecha, motivo || null]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Días de descanso registrados' });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: 'Error al registrar días de descanso' });
  } finally {
    conn.release();
  }
};

/**
 * DELETE /api/horarios/descansos/:id
 * El barbero elimina un día de descanso específico.
 */
const removeDescanso = async (req, res) => {
  const { id } = req.params;
  const barbero_id = req.user.id;

  try {
    const [result] = await db.query(
      'DELETE FROM dias_descanso WHERE id = ? AND barbero_id = ?',
      [id, barbero_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Día de descanso no encontrado' });
    }

    res.json({ message: 'Día de descanso eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar día de descanso' });
  }
};

// ================================================================
// BLOQUEOS DE HORA
// ================================================================

/**
 * GET /api/horarios/:barbero_id/bloqueos?fecha=YYYY-MM-DD
 * Lista los bloqueos de una fecha específica.
 */
const getBloqueos = async (req, res) => {
  const { barbero_id } = req.params;
  const { fecha } = req.query;

  try {
    let query = 'SELECT id, fecha, hora_inicio, hora_fin, motivo FROM horario_bloqueos WHERE barbero_id = ?';
    const params = [barbero_id];

    if (fecha) { query += ' AND fecha = ?'; params.push(fecha); }

    query += ' ORDER BY fecha ASC, hora_inicio ASC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener bloqueos' });
  }
};

/**
 * POST /api/horarios/bloqueos
 * El barbero bloquea un tramo horario en una fecha concreta.
 * Body: { "fecha": "2025-06-10", "hora_inicio": "12:00", "hora_fin": "13:00", "motivo": "Almuerzo" }
 */
const addBloqueo = async (req, res) => {
  const barbero_id = req.user.id;
  const { fecha, hora_inicio, hora_fin, motivo } = req.body;

  if (!fecha || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'fecha, hora_inicio y hora_fin son obligatorios' });
  }
  if (hora_fin <= hora_inicio) {
    return res.status(400).json({ error: 'hora_fin debe ser mayor que hora_inicio' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO horario_bloqueos (barbero_id, fecha, hora_inicio, hora_fin, motivo)
       VALUES (?, ?, ?, ?, ?)`,
      [barbero_id, fecha, hora_inicio, hora_fin, motivo || null]
    );
    res.status(201).json({ message: 'Bloqueo registrado', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar bloqueo' });
  }
};

/**
 * DELETE /api/horarios/bloqueos/:id
 */
const removeBloqueo = async (req, res) => {
  const { id } = req.params;
  const barbero_id = req.user.id;

  try {
    const [result] = await db.query(
      'DELETE FROM horario_bloqueos WHERE id = ? AND barbero_id = ?',
      [id, barbero_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bloqueo no encontrado' });
    }

    res.json({ message: 'Bloqueo eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar bloqueo' });
  }
};

// ================================================================
// DISPONIBILIDAD — endpoint todo-en-uno para la app cliente
// ================================================================

/**
 * GET /api/horarios/:barbero_id/disponibilidad?fecha=YYYY-MM-DD&duracion=30
 *
 * Retorna los slots disponibles para una fecha dada, teniendo en cuenta:
 *   1. Si el día de la semana está activo en el horario del barbero
 *   2. Si la fecha es un día de descanso
 *   3. Las citas ya agendadas (status != 'cancelled')
 *   4. Los bloqueos manuales
 *
 * duracion: duración del servicio en minutos (default 30)
 */
const getDisponibilidad = async (req, res) => {
  const { barbero_id } = req.params;
  const { fecha, duracion = 30 } = req.query;

  if (!fecha) {
    return res.status(400).json({ error: 'El parámetro fecha es obligatorio (YYYY-MM-DD)' });
  }

  try {
    // 1. Verificar que la fecha no sea día de descanso
    const [descanso] = await db.query(
      'SELECT id FROM dias_descanso WHERE barbero_id = ? AND fecha = ?',
      [barbero_id, fecha]
    );
    if (descanso.length > 0) {
      return res.json({ disponible: false, motivo: 'Día de descanso', slots: [] });
    }

    // 2. Obtener el horario del día de la semana correspondiente
    const diaSemana = new Date(fecha + 'T12:00:00').getDay(); // 0=Dom … 6=Sab
    const [horario] = await db.query(
      'SELECT hora_inicio, hora_fin, activo FROM horarios WHERE barbero_id = ? AND dia_semana = ?',
      [barbero_id, diaSemana]
    );

    if (horario.length === 0 || !horario[0].activo) {
      return res.json({ disponible: false, motivo: 'El barbero no atiende ese día', slots: [] });
    }

    const { hora_inicio, hora_fin } = horario[0];

    // 3. Citas ya ocupadas ese día
    const [citas] = await db.query(
      `SELECT hora FROM citas
       WHERE barbero_id = ? AND fecha = ? AND status NOT IN ('cancelled')`,
      [barbero_id, fecha]
    );
    const ocupadas = new Set(citas.map(c => c.hora.slice(0, 5))); // "HH:MM"

    // 4. Bloqueos manuales ese día
    const [bloqueos] = await db.query(
      'SELECT hora_inicio, hora_fin FROM horario_bloqueos WHERE barbero_id = ? AND fecha = ?',
      [barbero_id, fecha]
    );

    // 5. Generar slots
    const slots = [];
    const durMin = parseInt(duracion, 10);

    // Convertir "HH:MM:SS" → minutos desde medianoche
    const toMin = t => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toStr = m => {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const inicio = toMin(hora_inicio);
    const fin    = toMin(hora_fin);

    for (let t = inicio; t + durMin <= fin; t += durMin) {
      const slotStr = toStr(t);
      const slotFin = t + durMin;

      // ¿Está ocupado por una cita?
      if (ocupadas.has(slotStr)) continue;

      // ¿Cae dentro de algún bloqueo?
      const bloqueado = bloqueos.some(b => {
        const bInicio = toMin(b.hora_inicio);
        const bFin    = toMin(b.hora_fin);
        return t < bFin && slotFin > bInicio;
      });
      if (bloqueado) continue;

      slots.push(slotStr);
    }

    res.json({ disponible: true, fecha, slots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular disponibilidad' });
  }
};

module.exports = {
  getHorario,
  upsertHorario,
  getDescansos,
  addDescansos,
  removeDescanso,
  getBloqueos,
  addBloqueo,
  removeBloqueo,
  getDisponibilidad,
};