'use strict';
const express = require('express');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 3001;

async function start() {
  // Inicializar BD (maneja tanto better-sqlite3 como sql.js)
  const db = require('./db/database');
  if (db._async && !db._ready) {
    await db._initPromise;
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Rutas API
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/clientes', require('./routes/clientes'));
  app.use('/api/trabajos', require('./routes/trabajos'));
  app.use('/api/presupuestos', require('./routes/presupuestos'));
  app.use('/api/facturas', require('./routes/facturas'));
  app.use('/api/cobros', require('./routes/cobros'));
  app.use('/api/conceptos-reutilizables', require('./routes/conceptos'));
  app.use('/api/plantillas-recordatorio', require('./routes/plantillas'));

  // Servir PDFs generados
  app.use('/pdfs', express.static(path.join(__dirname, 'data', 'pdfs')));

  // Health check
  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.listen(PORT, () => {
    console.log(`🔧 Control de Trabajos — http://localhost:${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/health`);
  });
}

start().catch(err => { console.error('Error arrancando servidor:', err); process.exit(1); });
