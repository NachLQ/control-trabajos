'use strict';
/**
 * Adaptador sql.js que implementa la API síncrona de better-sqlite3.
 * Se usa como fallback cuando better-sqlite3 no está disponible (ej: entornos
 * sin herramientas de compilación nativa).
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class Statement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
  }

  _normalizeParams(args) {
    if (args.length === 0) return [];
    if (args.length === 1 && Array.isArray(args[0])) return args[0];
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
      // Object params → convert to named format for sql.js
      return args[0];
    }
    return [...args];
  }

  run(...args) {
    const params = this._normalizeParams(args);
    this._db._db.run(this._sql, params);
    const r = this._db._db.exec('SELECT last_insert_rowid() as r, changes() as c');
    const lastInsertRowid = r[0] ? r[0].values[0][0] : 0;
    const changes = r[0] ? r[0].values[0][1] : 0;
    this._db._persist();
    return { lastInsertRowid, changes };
  }

  get(...args) {
    const params = this._normalizeParams(args);
    const stmt = this._db._db.prepare(this._sql);
    try {
      stmt.bind(params);
      if (stmt.step()) return stmt.getAsObject();
      return undefined;
    } finally { stmt.free(); }
  }

  all(...args) {
    const params = this._normalizeParams(args);
    const stmt = this._db._db.prepare(this._sql);
    const rows = [];
    try {
      stmt.bind(params);
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally { stmt.free(); }
  }
}

class SqlJsDB {
  constructor(sqlDb, dbPath) {
    this._db = sqlDb;
    this._dbPath = dbPath;
  }

  prepare(sql) { return new Statement(this, sql); }

  exec(sql) {
    // Execute multi-statement SQL (CREATE TABLE blocks etc.)
    // Run statement by statement
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const s of stmts) {
      try { this._db.run(s + ';'); } catch (e) { /* ignore */ }
    }
    this._persist();
  }

  pragma() { /* no-op for sql.js */ }

  _persist() {
    const data = this._db.export();
    fs.writeFileSync(this._dbPath, Buffer.from(data));
  }
}

let _instance = null;

async function createSqlJsDB(dbPath) {
  if (_instance) return _instance;
  const SQL = await initSqlJs();
  let sqlDb;
  if (fs.existsSync(dbPath)) {
    sqlDb = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    sqlDb = new SQL.Database();
  }
  _instance = new SqlJsDB(sqlDb, dbPath);
  return _instance;
}

module.exports = { createSqlJsDB };
