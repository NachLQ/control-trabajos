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
  const last = db.prepare(`SELECT numero FROM presupuestos WHERE numero LIKE ? ORDER BY id DESC LIMIT 1`).get(`PRES-${year}-%`);
  if (!last) return `PRES-${year}-0001`;
  const n = parseInt(last.numero.split('-').pop()) + 1;
  return `PRES-${year}-${String(n).padStart(4, '0')}`;
}

router.get('/', (req, res) => {
  const { cliente_id, estado } = req.query;
  let q = `SELECT p.*, cl.nombre as cliente_nombre FROM presupuestos p JOIN clientes cl ON p.cliente_id = cl.id WHERE 1=1`;
  const params = [];
  if (cliente_id) { q += ' AND p.cliente_id = ?'; params.push(cliente_id); }
  if (estado) { q += ' AND p.estado = ?'; params.push(estado); }
  q += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', (req, res) => {
  const { cliente_id, trabajo_id, fecha, validez_hasta, estado, iva_porcentaje, descuento, notas, lineas } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente obligatorio' });

  const numero = siguienteNumero();
  const today = new Date().toISOString().split('T')[0];
  const validez = validez_hasta || (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })();

  const arr = lineas || [];
  const iva = iva_porcentaje !== undefined ? iva_porcentaje : 21;
  const desc = descuento || 0;
  const { subtotal, iva_total, total } = calcularTotales(arr, iva, desc);

  const result = db.prepare(`
    INSERT INTO presupuestos (cliente_id, trabajo_id, numero, fecha, validez_hasta, estado, iva_porcentaje, descuento, notas, subtotal, iva_total, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cliente_id, trabajo_id || null, numero, fecha || today, validez, estado || 'borrador', iva, desc, notas || '', subtotal, iva_total, total);

  const presId = result.lastInsertRowid;
  const insertLinea = db.prepare(`
    INSERT INTO lineas_concepto (tipo_documento, documento_id, concepto, descripcion, cantidad, precio_unitario, iva_porcentaje, total)
    VALUES ('presupuesto', ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of arr) {
    const lTotal = l.cantidad * l.precio_unitario;
    insertLinea.run(presId, l.concepto, l.descripcion || '', l.cantidad, l.precio_unitario, l.iva_porcentaje || iva, lTotal);
  }

  res.status(201).json(db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(presId));
});

router.get('/:id', (req, res) => {
  const p = db.prepare(`
    SELECT p.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono, cl.email as cliente_email,
    cl.direccion as cliente_direccion, cl.nif as cliente_nif
    FROM presupuestos p JOIN clientes cl ON p.cliente_id = cl.id WHERE p.id = ?
  `).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  const lineas = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='presupuesto' AND documento_id=?").all(req.params.id);
  res.json({ ...p, lineas });
});

router.put('/:id', (req, res) => {
  const exists = db.prepare('SELECT id FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  const { cliente_id, trabajo_id, fecha, validez_hasta, estado, iva_porcentaje, descuento, notas, lineas } = req.body;
  const iva = iva_porcentaje !== undefined ? iva_porcentaje : 21;
  const desc = descuento || 0;
  const arr = lineas || [];
  const { subtotal, iva_total, total } = calcularTotales(arr, iva, desc);

  db.prepare(`
    UPDATE presupuestos SET cliente_id=COALESCE(?,cliente_id), trabajo_id=?, fecha=COALESCE(?,fecha),
    validez_hasta=COALESCE(?,validez_hasta), estado=COALESCE(?,estado), iva_porcentaje=?,
    descuento=?, notas=COALESCE(?,notas), subtotal=?, iva_total=?, total=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(cliente_id||null, trabajo_id||null, fecha||null, validez_hasta||null, estado||null, iva, desc, notas||null, subtotal, iva_total, total, req.params.id);

  if (lineas) {
    db.prepare("DELETE FROM lineas_concepto WHERE tipo_documento='presupuesto' AND documento_id=?").run(req.params.id);
    const ins = db.prepare(`
      INSERT INTO lineas_concepto (tipo_documento, documento_id, concepto, descripcion, cantidad, precio_unitario, iva_porcentaje, total)
      VALUES ('presupuesto', ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const l of lineas) {
      ins.run(req.params.id, l.concepto, l.descripcion || '', l.cantidad, l.precio_unitario, l.iva_porcentaje || iva, l.cantidad * l.precio_unitario);
    }
  }

  const p = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id);
  const lins = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='presupuesto' AND documento_id=?").all(req.params.id);
  res.json({ ...p, lineas: lins });
});

// Convertir presupuesto a factura
router.post('/:id/convertir-a-factura', (req, res) => {
  const p = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  const year = new Date().getFullYear();
  const lastFac = db.prepare(`SELECT numero FROM facturas WHERE numero LIKE ? ORDER BY id DESC LIMIT 1`).get(`FAC-${year}-%`);
  let numFac;
  if (!lastFac) { numFac = `FAC-${year}-0001`; }
  else { const n = parseInt(lastFac.numero.split('-').pop()) + 1; numFac = `FAC-${year}-${String(n).padStart(4, '0')}`; }

  const today = new Date().toISOString().split('T')[0];
  const vencimiento = req.body.vencimiento_dias
    ? (() => { const d = new Date(); d.setDate(d.getDate() + req.body.vencimiento_dias); return d.toISOString().split('T')[0]; })()
    : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })();

  const facResult = db.prepare(`
    INSERT INTO facturas (cliente_id, trabajo_id, presupuesto_id, numero, fecha, vencimiento, estado, iva_porcentaje, descuento, notas, subtotal, iva_total, total)
    VALUES (?, ?, ?, ?, ?, ?, 'emitida', ?, ?, ?, ?, ?, ?)
  `).run(p.cliente_id, p.trabajo_id, p.id, numFac, today, vencimiento, p.iva_porcentaje, p.descuento, p.notas || '', p.subtotal, p.iva_total, p.total);

  const facId = facResult.lastInsertRowid;
  const lineas = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='presupuesto' AND documento_id=?").all(p.id);
  const ins = db.prepare(`
    INSERT INTO lineas_concepto (tipo_documento, documento_id, concepto, descripcion, cantidad, precio_unitario, iva_porcentaje, total)
    VALUES ('factura', ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of lineas) ins.run(facId, l.concepto, l.descripcion, l.cantidad, l.precio_unitario, l.iva_porcentaje, l.total);

  // Crear cobro automático
  db.prepare(`
    INSERT INTO cobros (factura_id, cliente_id, importe, fecha_vencimiento, estado, metodo)
    VALUES (?, ?, ?, ?, 'pendiente', 'transferencia')
  `).run(facId, p.cliente_id, p.total, vencimiento);

  // Marcar presupuesto como convertido
  db.prepare("UPDATE presupuestos SET estado='convertido', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(p.id);

  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(facId);
  res.status(201).json(factura);
});

// PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const p = db.prepare(`
      SELECT pr.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
      cl.email as cliente_email, cl.direccion as cliente_direccion, cl.nif as cliente_nif
      FROM presupuestos pr JOIN clientes cl ON pr.cliente_id = cl.id WHERE pr.id = ?
    `).get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Presupuesto no encontrado' });
    const lineas = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='presupuesto' AND documento_id=?").all(req.params.id);
    const pdfBuffer = await generarPDF({ tipo: 'presupuesto', doc: p, lineas });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${p.numero}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
