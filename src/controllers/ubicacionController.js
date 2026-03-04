const db = require('../config/db');

// ================================================================
// UBICACIÓN DE LA BARBERÍA
// ================================================================

/**
 * GET /api/ubicacion/:barbero_id
 * Pública — cualquier cliente puede ver dónde está la barbería.
 */
const getUbicacion = async (req, res) => {
  const { barbero_id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.barbero_id, u.direccion, u.ciudad, u.departamento,
              u.pais, u.latitud, u.longitud, u.referencia, u.maps_url,
              usr.nombre_barberia, usr.nombre, usr.apellido
       FROM barberia_ubicacion u
       JOIN usuarios usr ON u.barbero_id = usr.id
       WHERE u.barbero_id = ?`,
      [barbero_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Este barbero no tiene ubicación registrada' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener ubicación' });
  }
};

/**
 * PUT /api/ubicacion
 * El barbero autenticado crea o actualiza su ubicación.
 * Body: {
 *   "direccion": "3a Calle Pte #45",
 *   "ciudad": "San Salvador",
 *   "departamento": "San Salvador",
 *   "pais": "El Salvador",          // opcional, default ya está en la tabla
 *   "latitud": 13.6929,             // opcional pero recomendado
 *   "longitud": -89.2182,           // opcional pero recomendado
 *   "referencia": "Frente al parque",
 *   "maps_url": "https://maps.app.goo.gl/..."
 * }
 */
const upsertUbicacion = async (req, res) => {
  const barbero_id = req.user.id;
  const { direccion, ciudad, departamento, pais, latitud, longitud, referencia, maps_url } = req.body;

  if (!direccion || !ciudad) {
    return res.status(400).json({ error: 'direccion y ciudad son obligatorios' });
  }

  try {
    await db.query(
      `INSERT INTO barberia_ubicacion
         (barbero_id, direccion, ciudad, departamento, pais, latitud, longitud, referencia, maps_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         direccion    = VALUES(direccion),
         ciudad       = VALUES(ciudad),
         departamento = VALUES(departamento),
         pais         = VALUES(pais),
         latitud      = VALUES(latitud),
         longitud     = VALUES(longitud),
         referencia   = VALUES(referencia),
         maps_url     = VALUES(maps_url)`,
      [
        barbero_id,
        direccion,
        ciudad,
        departamento || null,
        pais || 'El Salvador',
        latitud  !== undefined ? latitud  : null,
        longitud !== undefined ? longitud : null,
        referencia || null,
        maps_url   || null,
      ]
    );

    res.json({ message: 'Ubicación guardada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar ubicación' });
  }
};

/**
 * DELETE /api/ubicacion
 * El barbero elimina su ubicación registrada.
 */
const deleteUbicacion = async (req, res) => {
  const barbero_id = req.user.id;
  try {
    await db.query('DELETE FROM barberia_ubicacion WHERE barbero_id = ?', [barbero_id]);
    res.json({ message: 'Ubicación eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar ubicación' });
  }
};

/**
 * GET /api/ubicacion/cerca?lat=13.69&lng=-89.21&radio=5
 * Devuelve barberos dentro de X kilómetros usando la fórmula de Haversine en SQL.
 * radio: kilómetros (default 10)
 */
const getBarberosCerca = async (req, res) => {
  const { lat, lng, radio = 10 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat y lng son obligatorios' });
  }

  try {
    // Fórmula Haversine en MySQL para calcular distancia en km
    const [rows] = await db.query(
      `SELECT
          u.id, u.nombre, u.apellido, u.nombre_barberia,
          u.foto_perfil, u.rating_promedio, u.total_cortes,
          ub.direccion, ub.ciudad, ub.referencia,
          ub.latitud, ub.longitud, ub.maps_url,
          (
            6371 * ACOS(
              COS(RADIANS(?)) * COS(RADIANS(ub.latitud)) *
              COS(RADIANS(ub.longitud) - RADIANS(?)) +
              SIN(RADIANS(?)) * SIN(RADIANS(ub.latitud))
            )
          ) AS distancia_km
       FROM barberia_ubicacion ub
       JOIN usuarios u ON ub.barbero_id = u.id
       WHERE u.rol = 'barbero'
         AND u.estado = 'activo'
         AND ub.latitud IS NOT NULL
         AND ub.longitud IS NOT NULL
       HAVING distancia_km <= ?
       ORDER BY distancia_km ASC`,
      [lat, lng, lat, radio]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar barberos cercanos' });
  }
};

module.exports = { getUbicacion, upsertUbicacion, deleteUbicacion, getBarberosCerca };