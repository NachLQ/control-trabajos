'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const { estado, prioridad, cliente_id } = req.query;
  let q = `SELECT t.*, cl.nombre as cliente_nombre FROM trabajos t JOIN clientes cl ON t.cliente_id = cl.id WHERE 1=1`;
  const params = [];
  if (estado) { q += ' AND t.estado = ?'; params.push(estado); }
  if (prioridad) { q += ' AND t.prioridad = ?'; params.push(prioridad); }
  if (cliente_id) { q += ' AND t.cliente_id = ?'; params.push(cliente_id); }
  q += ' ORDER BY CASE t.prioridad WHEN \'urgente\' THEN 1 WHEN \'normal\' THEN 2 ELSE 3 END, t.fecha_prevista ASC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', (req, res) => {
  const { cliente_id, titulo, descripcion, estado, prioridad, fecha_creacion, fecha_prevista, materiales, notas } = req.body;
  if (!titulo) return res.status(400).json({ error: 'El título es obligatorio' });
  if (!cliente_id) return res.status(400).json({ error: 'El cliente es obligatorio' });

  const today = new Date().toISOString().split('T')[0];
  const result = db.prepare(`
    INSERT INTO trabajos (cliente_id, titulo, descripcion, estado, prioridad, fecha_creacion, fecha_prevista, materiales, notas, fotos_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')
  `).run(
    cliente_id, titulo, descripcion || '', estado || 'pendiente', prioridad || 'normal',
    fecha_creacion || today, fecha_prevista || '', materiales || '', notas || ''
  );
  const trabajo = db.prepare(`
    SELECT t.*, cl.nombre as cliente_nombre FROM trabajos t JOIN clientes cl ON t.cliente_id = cl.id WHERE t.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(trabajo);
});

router.get('/:id', (req, res) => {
  const trabajo = db.prepare(`
    SELECT t.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono
    FROM trabajos t JOIN clientes cl ON t.cliente_id = cl.id WHERE t.id = ?
  `).get(req.params.id);
  if (!trabajo) return res.status(404).json({ error: 'Trabajo no encontrado' });

  let presupuesto = null, factura = null;
  if (trabajo.presupuesto_id) presupuesto = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(trabajo.presupuesto_id);
  if (trabajo.factura_id) factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(trabajo.factura_id);

  res.json({ ...trabajo, fotos: JSON.parse(trabajo.fotos_json || '[]'), presupuesto, factura });
});

router.put('/:id', (req, res) => {
  const exists = db.prepare('SELECT id FROM trabajos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Trabajo no encontrado' });

  const { cliente_id, titulo, descripcion, estado, prioridad, fecha_prevista, materiales, notas, fotos_json } = req.body;
  db.prepare(`
    UPDATE trabajos SET
      cliente_id=COALESCE(?,cliente_id), titulo=COALESCE(?,titulo), descripcion=COALESCE(?,descripcion),
      estado=COALESCE(?,estado), prioridad=COALESCE(?,prioridad), fecha_prevista=COALESCE(?,fecha_prevista),
      materiales=COALESCE(?,materiales), notas=COALESCE(?,notas), fotos_json=COALESCE(?,fotos_json),
      updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    cliente_id||null, titulo||null, descripcion||null, estado||null, prioridad||null,
    fecha_prevista||null, materiales||null, notas||null,
    fotos_json ? JSON.stringify(fotos_json) : null,
    req.params.id
  );
  res.json(db.prepare(`
    SELECT t.*, cl.nombre as cliente_nombre FROM trabajos t JOIN clientes cl ON t.cliente_id = cl.id WHERE t.id = ?
  `).get(req.params.id));
});

module.exports = router;
