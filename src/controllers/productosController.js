const db = require('../config/db');

// GET /api/productos - Obtener todos los productos activos
const getProductos = async (req, res) => {
  const { categoria } = req.query;
  try {
    let query = `
      SELECT p.*, u.nombre AS barbero_nombre, u.nombre_barberia
      FROM productos p
      JOIN usuarios u ON p.barbero_id = u.id
      WHERE p.estado = 'activo'`;
    const params = [];

    if (categoria) {
      query += ' AND p.categoria = ?';
      params.push(categoria);
    }

    query += ' ORDER BY p.ventas DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// POST /api/productos - Crear producto (solo barbero)
const createProducto = async (req, res) => {
  const { nombre, descripcion, precio, categoria, stock, imagen_url } = req.body;
  const barbero_id = req.user.id;

  if (!nombre || !precio || !categoria || stock === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO productos (barbero_id, nombre, descripcion, precio, categoria, stock, imagen_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [barbero_id, nombre, descripcion || null, precio, categoria, stock, imagen_url || null]
    );
    res.status(201).json({ message: 'Producto creado', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

// PUT /api/productos/:id - Actualizar producto
const updateProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, categoria, stock, imagen_url, estado } = req.body;

  try {
    await db.query(
      `UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, 
       stock = ?, imagen_url = ?, estado = ? WHERE id = ? AND barbero_id = ?`,
      [nombre, descripcion, precio, categoria, stock, imagen_url, estado, id, req.user.id]
    );
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// DELETE /api/productos/:id
const deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE productos SET estado = ? WHERE id = ? AND barbero_id = ?',
      ['inactivo', id, req.user.id]);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

// POST /api/productos/orden - Procesar compra
const crearOrden = async (req, res) => {
  const { items } = req.body; // [{ producto_id, cantidad }]
  const cliente_id = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let total = 0;
    const detalles = [];

    for (const item of items) {
      const [prod] = await conn.query(
        'SELECT precio, stock FROM productos WHERE id = ? AND estado = "activo"',
        [item.producto_id]
      );
      if (prod.length === 0) throw new Error(`Producto ${item.producto_id} no encontrado`);
      if (prod[0].stock < item.cantidad) throw new Error(`Stock insuficiente para producto ${item.producto_id}`);

      const subtotal = prod[0].precio * item.cantidad;
      total += subtotal;
      detalles.push({ ...item, precio_unitario: prod[0].precio, subtotal });
    }

    // Crear orden
    const [orden] = await conn.query(
      'INSERT INTO ordenes (cliente_id, total) VALUES (?, ?)',
      [cliente_id, total]
    );

    // Insertar detalles y actualizar stock
    for (const detalle of detalles) {
      await conn.query(
        `INSERT INTO orden_detalle (orden_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orden.insertId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario, detalle.subtotal]
      );
      await conn.query(
        'UPDATE productos SET stock = stock - ?, ventas = ventas + ? WHERE id = ?',
        [detalle.cantidad, detalle.cantidad, detalle.producto_id]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Compra exitosa', orden_id: orden.insertId, total });
  } catch (error) {
    await conn.rollback();
    res.status(400).json({ error: error.message || 'Error al procesar compra' });
  } finally {
    conn.release();
  }
};

module.exports = { getProductos, createProducto, updateProducto, deleteProducto, crearOrden };
