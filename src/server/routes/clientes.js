'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const { q } = req.query;
  let query = 'SELECT * FROM clientes';
  let params = [];
  if (q) {
    query += ' WHERE nombre LIKE ? OR telefono LIKE ? OR email LIKE ?';
    const like = `%${q}%`;
    params = [like, like, like];
  }
  query += ' ORDER BY nombre ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { nombre, telefono, email, direccion, nif, notas } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const result = db.prepare(`
    INSERT INTO clientes (nombre, telefono, email, direccion, nif, notas)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(nombre, telefono || '', email || '', direccion || '', nif || '', notas || '');
  res.status(201).json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  const trabajos = db.prepare('SELECT * FROM trabajos WHERE cliente_id = ? ORDER BY created_at DESC').all(req.params.id);
  const presupuestos = db.prepare('SELECT * FROM presupuestos WHERE cliente_id = ? ORDER BY created_at DESC').all(req.params.id);
  const facturas = db.prepare('SELECT * FROM facturas WHERE cliente_id = ? ORDER BY created_at DESC').all(req.params.id);
  const cobros = db.prepare(`
    SELECT c.*, f.numero as factura_numero FROM cobros c
    JOIN facturas f ON c.factura_id = f.id
    WHERE c.cliente_id = ? ORDER BY c.fecha_vencimiento DESC
  `).all(req.params.id);

  res.json({ ...cliente, trabajos, presupuestos, facturas, cobros });
});

router.put('/:id', (req, res) => {
  const { nombre, telefono, email, direccion, nif, notas } = req.body;
  const exists = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Cliente no encontrado' });

  db.prepare(`
    UPDATE clientes SET nombre=?, telefono=?, email=?, direccion=?, nif=?, notas=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(nombre, telefono || '', email || '', direccion || '', nif || '', notas || '', req.params.id);

  res.json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
