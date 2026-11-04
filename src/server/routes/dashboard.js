'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Actualizar cobros vencidos
  db.prepare(`
    UPDATE cobros SET estado = 'vencido', updated_at = CURRENT_TIMESTAMP
    WHERE estado = 'pendiente' AND fecha_vencimiento < ?
  `).run(today);

  const totalPorCobrar = db.prepare(`
    SELECT COALESCE(SUM(importe), 0) as total
    FROM cobros WHERE estado IN ('pendiente','recordado','vencido')
  `).get();

  const cobrosVencidos = db.prepare(`
    SELECT c.*, cl.nombre as cliente_nombre, f.numero as factura_numero
    FROM cobros c
    JOIN clientes cl ON c.cliente_id = cl.id
    JOIN facturas f ON c.factura_id = f.id
    WHERE c.estado = 'vencido'
    ORDER BY c.fecha_vencimiento ASC
    LIMIT 5
  `).all();

  const cobrosHoy = db.prepare(`
    SELECT c.*, cl.nombre as cliente_nombre, f.numero as factura_numero
    FROM cobros c
    JOIN clientes cl ON c.cliente_id = cl.id
    JOIN facturas f ON c.factura_id = f.id
    WHERE c.fecha_vencimiento = ? AND c.estado IN ('pendiente','recordado')
    ORDER BY c.importe DESC
  `).all(today);

  const trabajosActivos = db.prepare(`
    SELECT t.*, cl.nombre as cliente_nombre
    FROM trabajos t
    JOIN clientes cl ON t.cliente_id = cl.id
    WHERE t.estado IN ('pendiente','en_curso','esperando_material')
    ORDER BY t.prioridad DESC, t.fecha_prevista ASC
    LIMIT 8
  `).all();

  const urgentes = db.prepare(`
    SELECT t.*, cl.nombre as cliente_nombre
    FROM trabajos t
    JOIN clientes cl ON t.cliente_id = cl.id
    WHERE t.prioridad = 'urgente' AND t.estado IN ('pendiente','en_curso','esperando_material')
    ORDER BY t.fecha_prevista ASC
  `).all();

  const resumen = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM trabajos WHERE estado IN ('pendiente','en_curso','esperando_material')) as trabajos_activos,
      (SELECT COUNT(*) FROM cobros WHERE estado = 'vencido') as cobros_vencidos_count,
      (SELECT COUNT(*) FROM cobros WHERE fecha_vencimiento = ? AND estado IN ('pendiente','recordado')) as cobros_hoy_count,
      (SELECT COUNT(*) FROM trabajos WHERE prioridad = 'urgente' AND estado IN ('pendiente','en_curso')) as urgentes_count
  `).get(today);

  res.json({
    total_por_cobrar: totalPorCobrar.total,
    cobros_vencidos: cobrosVencidos,
    cobros_hoy: cobrosHoy,
    trabajos_activos: trabajosActivos,
    urgentes,
    resumen
  });
});

module.exports = router;
