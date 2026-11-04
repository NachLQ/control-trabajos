'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM conceptos_reutilizables ORDER BY tipo, nombre').all());
});

router.post('/', (req, res) => {
  const { nombre, descripcion, precio_base, tipo, iva_porcentaje } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre obligatorio' });
  const result = db.prepare(`
    INSERT INTO conceptos_reutilizables (nombre, descripcion, precio_base, tipo, iva_porcentaje)
    VALUES (?, ?, ?, ?, ?)
  `).run(nombre, descripcion || '', precio_base || 0, tipo || 'servicio', iva_porcentaje || 21);
  res.status(201).json(db.prepare('SELECT * FROM conceptos_reutilizables WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { nombre, descripcion, precio_base, tipo, iva_porcentaje } = req.body;
  db.prepare(`
    UPDATE conceptos_reutilizables SET nombre=COALESCE(?,nombre), descripcion=COALESCE(?,descripcion),
    precio_base=COALESCE(?,precio_base), tipo=COALESCE(?,tipo), iva_porcentaje=COALESCE(?,iva_porcentaje)
    WHERE id=?
  `).run(nombre||null, descripcion||null, precio_base||null, tipo||null, iva_porcentaje||null, req.params.id);
  res.json(db.prepare('SELECT * FROM conceptos_reutilizables WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM conceptos_reutilizables WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
