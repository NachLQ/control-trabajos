'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM plantillas_recordatorio ORDER BY id').all());
});

router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM plantillas_recordatorio WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Plantilla no encontrada' });
  res.json(p);
});

router.put('/:id', (req, res) => {
  const { nombre, contenido } = req.body;
  db.prepare(`
    UPDATE plantillas_recordatorio SET nombre=COALESCE(?,nombre), contenido=COALESCE(?,contenido), updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(nombre||null, contenido||null, req.params.id);
  res.json(db.prepare('SELECT * FROM plantillas_recordatorio WHERE id = ?').get(req.params.id));
});

module.exports = router;
