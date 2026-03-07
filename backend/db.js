const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let pool = null;
let sqliteDb = null;
const useSqlite = process.env.FORCE_SQLITE === '1' || String(process.env.USE_SQLITE || '').toLowerCase() === 'true';

function initMysqlPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'learnlight',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  return pool;
}

function initSqlite() {
  if (sqliteDb) return sqliteDb;
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, process.env.SQLITE_PATH || 'data.sqlite');
    // ensure file exists
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '');
    }
    sqliteDb = new sqlite3.Database(dbPath);
    return sqliteDb;
  } catch (e) {
    // sqlite3 not installed
    throw new Error('SQLite not available: ' + e.message);
  }
}

function sqliteAll(sql, params) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params || [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function sqliteRun(sql, params) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params || [], function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function query(sql, params) {
  const q = String(sql).trim();
  const isDuplicateColumnError = (err) =>
    String(err?.message || '').toLowerCase().includes('duplicate column name');
  // If requested, use SQLite directly (useful for local dev without MySQL)
  if (useSqlite) {
    try {
      initSqlite();
      if (q.toUpperCase().startsWith('SELECT')) {
        return await sqliteAll(sql, params);
      } else {
        return await sqliteRun(sql, params);
      }
    } catch (e) {
      if (isDuplicateColumnError(e)) {
        return { lastID: null, changes: 0 };
      }
      console.warn('SQLite query failed:', e.message || e);
      if (q.toUpperCase().startsWith('SELECT')) return [];
      throw e;
    }
  }

  // prefer MySQL pool if available
  try {
    initMysqlPool();
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    // if MySQL is unreachable, try SQLite fallback
    const code = err && err.code ? err.code : null;
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || String(err).toLowerCase().includes('connect')) {
      try {
        initSqlite();
        if (q.toUpperCase().startsWith('SELECT')) {
          return await sqliteAll(sql, params);
        } else {
          return await sqliteRun(sql, params);
        }
      } catch (e) {
        if (isDuplicateColumnError(e)) {
          return { lastID: null, changes: 0 };
        }
        console.warn('SQLite fallback failed:', e.message);
        if (q.toUpperCase().startsWith('SELECT')) return [];
        throw e;
      }
    }
    // other errors: for SELECT return empty array, else rethrow
    console.warn('DB query error:', err.code || err.message);
    if (q.toUpperCase().startsWith('SELECT')) return [];
    throw err;
  }
}

module.exports = {
  query
};
