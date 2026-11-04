'use strict';
/**
 * Capa de base de datos.
 * Usa better-sqlite3 si está disponible (máquinas con compilador nativo).
 * Fallback a sql.js (WASM puro) para entornos sin herramientas de compilación.
 */
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(dataDir, 'control_trabajos.db');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT DEFAULT '',
    email TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    nif TEXT DEFAULT '',
    notas TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS trabajos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    titulo TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    estado TEXT DEFAULT 'pendiente',
    prioridad TEXT DEFAULT 'normal',
    fecha_creacion DATE,
    fecha_prevista DATE,
    materiales TEXT DEFAULT '',
    notas TEXT DEFAULT '',
    fotos_json TEXT DEFAULT '[]',
    presupuesto_id INTEGER,
    factura_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS presupuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    trabajo_id INTEGER,
    numero TEXT UNIQUE,
    fecha DATE,
    validez_hasta DATE,
    estado TEXT DEFAULT 'borrador',
    iva_porcentaje REAL DEFAULT 21,
    descuento REAL DEFAULT 0,
    notas TEXT DEFAULT '',
    subtotal REAL DEFAULT 0,
    iva_total REAL DEFAULT 0,
    total REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    trabajo_id INTEGER,
    presupuesto_id INTEGER,
    numero TEXT UNIQUE,
    fecha DATE,
    vencimiento DATE,
    estado TEXT DEFAULT 'borrador',
    iva_porcentaje REAL DEFAULT 21,
    descuento REAL DEFAULT 0,
    notas TEXT DEFAULT '',
    subtotal REAL DEFAULT 0,
    iva_total REAL DEFAULT 0,
    total REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS lineas_concepto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_documento TEXT,
    documento_id INTEGER,
    concepto TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    cantidad REAL DEFAULT 1,
    precio_unitario REAL DEFAULT 0,
    iva_porcentaje REAL DEFAULT 21,
    total REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS conceptos_reutilizables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    precio_base REAL DEFAULT 0,
    tipo TEXT DEFAULT 'servicio',
    iva_porcentaje REAL DEFAULT 21
  );
  CREATE TABLE IF NOT EXISTS cobros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER,
    cliente_id INTEGER,
    importe REAL DEFAULT 0,
    fecha_vencimiento DATE,
    fecha_pago DATE,
    estado TEXT DEFAULT 'pendiente',
    metodo TEXT DEFAULT 'transferencia',
    notas TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS recordatorios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cobro_id INTEGER,
    plantilla_tipo TEXT,
    mensaje TEXT,
    canal_simulado TEXT DEFAULT 'whatsapp',
    enviado_en DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS plantillas_recordatorio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT UNIQUE,
    nombre TEXT,
    contenido TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

// Try better-sqlite3 first
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  db._ready = true;
  db._async = false;
  console.log('📦 Base de datos: better-sqlite3');
  module.exports = db;
} catch (e) {
  // Fallback: sql.js (async init, but operations are sync after init)
  console.log('⚠️  better-sqlite3 no disponible, usando sql.js (WASM)');
  const { createSqlJsDB } = require('./sqljs-adapter');
  
  // Export a proxy that waits for init
  const pending = [];
  let _db = null;
  
  const proxy = {
    _async: true,
    _ready: false,
    _initPromise: createSqlJsDB(DB_PATH).then(instance => {
      _db = instance;
      instance.exec(SCHEMA);
      proxy._ready = true;
      pending.forEach(fn => fn(instance));
      return instance;
    }),
    prepare: (sql) => {
      if (!_db) throw new Error('DB not initialized. Await db._initPromise first.');
      return _db.prepare(sql);
    },
    exec: (sql) => {
      if (!_db) throw new Error('DB not initialized.');
      return _db.exec(sql);
    },
    pragma: () => {},
  };

  module.exports = proxy;
}
