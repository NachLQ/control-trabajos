'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { generarPDF } = require('../services/pdfService');

function calcularTotales(lineas, ivaPct, descuento) {
  const subtotalBruto = lineas.reduce((s, l) => s + (l.cantidad * l.precio_unitario), 0);
  const subtotal = subtotalBruto * (1 - (descuento || 0) / 100);
  const iva_total = subtotal * (ivaPct / 100);
  const total = subtotal + iva_total;
  return { subtotal: Math.round(subtotal * 100) / 100, iva_total: Math.round(iva_total * 100) / 100, total: Math.round(total * 100) / 100 };
}

function siguienteNumero() {
  const year = new Date().getFullYear();
  const last = db.prepare(`SELECT numero FROM facturas WHERE numero LIKE ? ORDER BY id DESC LIMIT 1`).get(`FAC-${year}-%`);
  if (!last) return `FAC-${year}-0001`;
  const n = parseInt(last.numero.split('-').pop()) + 1;
  return `FAC-${year}-${String(n).padStart(4, '0')}`;
}

router.get('/', (req, res) => {
  const { cliente_id, estado } = req.query;
  let q = `SELECT f.*, cl.nombre as cliente_nombre FROM facturas f JOIN clientes cl ON f.cliente_id = cl.id WHERE 1=1`;
  const params = [];
  if (cliente_id) { q += ' AND f.cliente_id = ?'; params.push(cliente_id); }
  if (estado) { q += ' AND f.estado = ?'; params.push(estado); }
  q += ' ORDER BY f.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', (req, res) => {
  const { cliente_id, trabajo_id, presupuesto_id, fecha, vencimiento, estado, iva_porcentaje, descuento, notas, lineas, vencimiento_dias } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente obligatorio' });

  const numero = siguienteNumero();
  const today = new Date().toISOString().split('T')[0];
  const dias = vencimiento_dias || 30;
  const venc = vencimiento || (() => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().split('T')[0]; })();
  const iva = iva_porcentaje !== undefined ? iva_porcentaje : 21;
  const desc = descuento || 0;
  const arr = lineas || [];
  const { subtotal, iva_total, total } = calcularTotales(arr, iva, desc);

  const result = db.prepare(`
    INSERT INTO facturas (cliente_id, trabajo_id, presupuesto_id, numero, fecha, vencimiento, estado, iva_porcentaje, descuento, notas, subtotal, iva_total, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cliente_id, trabajo_id || null, presupuesto_id || null, numero, fecha || today, venc, estado || 'emitida', iva, desc, notas || '', subtotal, iva_total, total);

  const facId = result.lastInsertRowid;
  const ins = db.prepare(`
    INSERT INTO lineas_concepto (tipo_documento, documento_id, concepto, descripcion, cantidad, precio_unitario, iva_porcentaje, total)
    VALUES ('factura', ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of arr) ins.run(facId, l.concepto, l.descripcion || '', l.cantidad, l.precio_unitario, l.iva_porcentaje || iva, l.cantidad * l.precio_unitario);

  // Crear cobro automático
  db.prepare(`INSERT INTO cobros (factura_id, cliente_id, importe, fecha_vencimiento, estado, metodo) VALUES (?, ?, ?, ?, 'pendiente', 'transferencia')`
  ).run(facId, cliente_id, total, venc);

  res.status(201).json(db.prepare('SELECT * FROM facturas WHERE id = ?').get(facId));
});

router.get('/:id', (req, res) => {
  const f = db.prepare(`
    SELECT f.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
    cl.email as cliente_email, cl.direccion as cliente_direccion, cl.nif as cliente_nif
    FROM facturas f JOIN clientes cl ON f.cliente_id = cl.id WHERE f.id = ?
  `).get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Factura no encontrada' });
  const lineas = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='factura' AND documento_id=?").all(req.params.id);
  const cobros = db.prepare('SELECT * FROM cobros WHERE factura_id = ?').all(req.params.id);
  res.json({ ...f, lineas, cobros });
});

router.put('/:id', (req, res) => {
  const exists = db.prepare('SELECT id FROM facturas WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Factura no encontrada' });

  const { cliente_id, trabajo_id, fecha, vencimiento, estado, iva_porcentaje, descuento, notas, lineas } = req.body;
  const iva = iva_porcentaje !== undefined ? iva_porcentaje : 21;
  const desc = descuento || 0;
  const arr = lineas || [];
  const { subtotal, iva_total, total } = calcularTotales(arr, iva, desc);

  db.prepare(`
    UPDATE facturas SET cliente_id=COALESCE(?,cliente_id), trabajo_id=?, fecha=COALESCE(?,fecha),
    vencimiento=COALESCE(?,vencimiento), estado=COALESCE(?,estado), iva_porcentaje=?,
    descuento=?, notas=COALESCE(?,notas), subtotal=?, iva_total=?, total=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(cliente_id||null, trabajo_id||null, fecha||null, vencimiento||null, estado||null, iva, desc, notas||null, subtotal, iva_total, total, req.params.id);

  if (lineas) {
    db.prepare("DELETE FROM lineas_concepto WHERE tipo_documento='factura' AND documento_id=?").run(req.params.id);
    const ins = db.prepare(`
      INSERT INTO lineas_concepto (tipo_documento, documento_id, concepto, descripcion, cantidad, precio_unitario, iva_porcentaje, total)
      VALUES ('factura', ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const l of lineas) ins.run(req.params.id, l.concepto, l.descripcion || '', l.cantidad, l.precio_unitario, l.iva_porcentaje || iva, l.cantidad * l.precio_unitario);
  }

  const f = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
  const lins = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='factura' AND documento_id=?").all(req.params.id);
  res.json({ ...f, lineas: lins });
});

router.post('/:id/marcar-pagada', (req, res) => {
  const f = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Factura no encontrada' });

  const today = new Date().toISOString().split('T')[0];
  db.prepare("UPDATE facturas SET estado='pagada', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(req.params.id);
  db.prepare("UPDATE cobros SET estado='pagado', fecha_pago=?, updated_at=CURRENT_TIMESTAMP WHERE factura_id=? AND estado != 'pagado'").run(today, req.params.id);

  res.json(db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id));
});

// PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const f = db.prepare(`
      SELECT fac.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
      cl.email as cliente_email, cl.direccion as cliente_direccion, cl.nif as cliente_nif
      FROM facturas fac JOIN clientes cl ON fac.cliente_id = cl.id WHERE fac.id = ?
    `).get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Factura no encontrada' });
    const lineas = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='factura' AND documento_id=?").all(req.params.id);
    const pdfBuffer = await generarPDF({ tipo: 'factura', doc: f, lineas });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${f.numero}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
