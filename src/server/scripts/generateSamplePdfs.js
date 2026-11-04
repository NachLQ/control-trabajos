'use strict';
const fs = require('fs');
const path = require('path');

async function run() {
  const db = require('../db/database');
  if (db._async && !db._ready) await db._initPromise;

  const { generarPDF } = require('../services/pdfService');

  const outDir = path.join(__dirname, '..', 'data', 'pdfs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('📄 Generando PDFs de ejemplo...');

  // 1. Presupuesto ejemplo
  const p = db.prepare(`
    SELECT pr.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
    cl.email as cliente_email, cl.direccion as cliente_direccion, cl.nif as cliente_nif
    FROM presupuestos pr JOIN clientes cl ON pr.cliente_id = cl.id ORDER BY pr.id LIMIT 1
  `).get();
  if (p) {
    const lineas = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='presupuesto' AND documento_id=?").all(p.id);
    const buf = await generarPDF({ tipo: 'presupuesto', doc: p, lineas });
    const file = path.join(outDir, `${p.numero}.pdf`);
    fs.writeFileSync(file, buf);
    console.log(`  ✅ ${p.numero}.pdf (${buf.length} bytes)`);
  }

  // 2. Factura pendiente/vencida
  const f1 = db.prepare(`
    SELECT fac.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
    cl.email as cliente_email, cl.direccion as cliente_direccion, cl.nif as cliente_nif
    FROM facturas fac JOIN clientes cl ON fac.cliente_id = cl.id
    WHERE fac.estado IN ('emitida','vencida') ORDER BY fac.id LIMIT 1
  `).get();
  if (f1) {
    const lineas = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='factura' AND documento_id=?").all(f1.id);
    const buf = await generarPDF({ tipo: 'factura', doc: f1, lineas });
    const file = path.join(outDir, `${f1.numero}.pdf`);
    fs.writeFileSync(file, buf);
    console.log(`  ✅ ${f1.numero}.pdf - pendiente/vencida (${buf.length} bytes)`);
  }

  // 3. Factura pagada
  const f2 = db.prepare(`
    SELECT fac.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
    cl.email as cliente_email, cl.direccion as cliente_direccion, cl.nif as cliente_nif
    FROM facturas fac JOIN clientes cl ON fac.cliente_id = cl.id
    WHERE fac.estado = 'pagada' ORDER BY fac.id LIMIT 1
  `).get();
  if (f2) {
    const lineas = db.prepare("SELECT * FROM lineas_concepto WHERE tipo_documento='factura' AND documento_id=?").all(f2.id);
    const buf = await generarPDF({ tipo: 'factura', doc: f2, lineas });
    const file = path.join(outDir, `${f2.numero}-PAGADA.pdf`);
    fs.writeFileSync(file, buf);
    console.log(`  ✅ ${f2.numero}-PAGADA.pdf (${buf.length} bytes)`);
  }

  console.log(`\n📁 PDFs en: ${outDir}`);
}

run().catch(e => { console.error(e); process.exit(1); });
