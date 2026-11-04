'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const recordatorioService = require('../services/recordatorioService');

router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Actualizar vencidos
  db.prepare("UPDATE cobros SET estado='vencido', updated_at=CURRENT_TIMESTAMP WHERE estado IN ('pendiente','recordado') AND fecha_vencimiento < ?").run(today);

  const { filtro } = req.query;
  let q = `
    SELECT c.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono, f.numero as factura_numero
    FROM cobros c
    JOIN clientes cl ON c.cliente_id = cl.id
    JOIN facturas f ON c.factura_id = f.id
    WHERE 1=1
  `;
  const params = [];

  if (filtro === 'vencidos') {
    q += " AND c.estado = 'vencido'";
  } else if (filtro === 'hoy') {
    q += " AND c.fecha_vencimiento = ? AND c.estado IN ('pendiente','recordado')";
    params.push(today);
  } else if (filtro === 'proximos7') {
    const d7 = new Date(); d7.setDate(d7.getDate() + 7);
    q += " AND c.fecha_vencimiento BETWEEN ? AND ? AND c.estado IN ('pendiente','recordado')";
    params.push(today, d7.toISOString().split('T')[0]);
  } else if (filtro === 'pendientes') {
    q += " AND c.estado IN ('pendiente','recordado','vencido')";
  } else if (filtro === 'pagados') {
    q += " AND c.estado = 'pagado'";
  }

  q += ' ORDER BY CASE c.estado WHEN \'vencido\' THEN 1 WHEN \'recordado\' THEN 2 WHEN \'pendiente\' THEN 3 ELSE 4 END, c.fecha_vencimiento ASC';

  const cobros = db.prepare(q).all(...params);
  res.json(cobros);
});

router.put('/:id', (req, res) => {
  const { estado, metodo, notas, fecha_pago } = req.body;
  db.prepare(`
    UPDATE cobros SET estado=COALESCE(?,estado), metodo=COALESCE(?,metodo), notas=COALESCE(?,notas),
    fecha_pago=COALESCE(?,fecha_pago), updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(estado||null, metodo||null, notas||null, fecha_pago||null, req.params.id);
  res.json(db.prepare('SELECT * FROM cobros WHERE id = ?').get(req.params.id));
});

router.post('/:id/marcar-pagado', (req, res) => {
  const cobro = db.prepare('SELECT * FROM cobros WHERE id = ?').get(req.params.id);
  if (!cobro) return res.status(404).json({ error: 'Cobro no encontrado' });

  const today = new Date().toISOString().split('T')[0];
  const metodo = req.body.metodo || cobro.metodo;
  db.prepare("UPDATE cobros SET estado='pagado', fecha_pago=?, metodo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(today, metodo, req.params.id);
  db.prepare("UPDATE facturas SET estado='pagada', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(cobro.factura_id);

  res.json(db.prepare('SELECT * FROM cobros WHERE id = ?').get(req.params.id));
});

router.post('/:id/recordatorio', (req, res) => {
  const cobro = db.prepare(`
    SELECT c.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
    f.numero as factura_numero
    FROM cobros c JOIN clientes cl ON c.cliente_id = cl.id JOIN facturas f ON c.factura_id = f.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!cobro) return res.status(404).json({ error: 'Cobro no encontrado' });

  const tipo = req.body.tipo || 'amable';
  const plantilla = db.prepare('SELECT * FROM plantillas_recordatorio WHERE tipo = ?').get(tipo);
  if (!plantilla) return res.status(404).json({ error: 'Plantilla no encontrada' });

  const mensaje = recordatorioService.generarMensaje(plantilla.contenido, {
    nombre: cobro.cliente_nombre,
    numero: cobro.factura_numero,
    importe: cobro.importe.toFixed(2),
    vencimiento: cobro.fecha_vencimiento,
    metodo: cobro.metodo,
    telefono: cobro.cliente_telefono
  });

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const result = db.prepare(`
    INSERT INTO recordatorios (cobro_id, plantilla_tipo, mensaje, canal_simulado, enviado_en)
    VALUES (?, ?, ?, ?, ?)
  `).run(cobro.id, tipo, mensaje, req.body.canal || 'whatsapp', now);

  db.prepare("UPDATE cobros SET estado='recordado', updated_at=CURRENT_TIMESTAMP WHERE id=? AND estado != 'pagado'").run(cobro.id);

  const recordatorio = db.prepare('SELECT * FROM recordatorios WHERE id = ?').get(result.lastInsertRowid);
  res.json({ recordatorio, mensaje, cobro: db.prepare('SELECT * FROM cobros WHERE id = ?').get(cobro.id) });
});

router.get('/:id/recordatorios', (req, res) => {
  const list = db.prepare('SELECT * FROM recordatorios WHERE cobro_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(list);
});

module.exports = router;
