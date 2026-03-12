const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { Pool: PgPool } = require('pg');

let pool = null;
let sqliteDb = null;
let pgPool = null;
const usePostgres =
  /^postgres(ql)?:\/\//i.test(String(process.env.DATABASE_URL || '')) ||
  Boolean(process.env.PGHOST) ||
  Boolean(process.env.PGHOSTADDR) ||
  Boolean(process.env.PGUSER);
const useSqlite = process.env.FORCE_SQLITE === '1' || String(process.env.USE_SQLITE || '').toLowerCase() === 'true';
const allowSqliteFallback =
  useSqlite ||
  process.env.ALLOW_SQLITE_FALLBACK === '1' ||
  String(process.env.NODE_ENV || '').toLowerCase() !== 'production';

function firstNonEmpty(...values) {
  for (const value of values) {
    const str = String(value ?? '').trim();
    if (str) return str;
  }
  return '';
}

function parseMysqlUrl(urlValue) {
  const raw = String(urlValue || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!/^mysql:?$/i.test(parsed.protocol)) return null;
    return {
      host: parsed.hostname || '',
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      database: String(parsed.pathname || '').replace(/^\//, '') || ''
    };
  } catch (e) {
    return null;
  }
}

function initMysqlPool() {
  if (pool) return pool;
  const urlConfig = parseMysqlUrl(
    firstNonEmpty(
      process.env.DATABASE_URL,
      process.env.MYSQL_PUBLIC_URL,
      process.env.MYSQL_URL,
      process.env.MYSQLURL
    )
  );

  const host = firstNonEmpty(urlConfig?.host, process.env.DB_HOST, process.env.MYSQLHOST, process.env.MYSQL_HOST) || '127.0.0.1';
  const portRaw = firstNonEmpty(urlConfig?.port, process.env.DB_PORT, process.env.MYSQLPORT, process.env.MYSQL_PORT);
  const user = firstNonEmpty(urlConfig?.user, process.env.DB_USER, process.env.MYSQLUSER, process.env.MYSQL_USER) || 'root';
  const password = firstNonEmpty(urlConfig?.password, process.env.DB_PASSWORD, process.env.MYSQLPASSWORD, process.env.MYSQL_PASSWORD);
  const database = firstNonEmpty(urlConfig?.database, process.env.DB_NAME, process.env.MYSQLDATABASE, process.env.MYSQL_DATABASE) || 'learnlight';

  pool = mysql.createPool({
    host,
    port: portRaw ? Number(portRaw) : 3306,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  return pool;
}

function initPostgresPool() {
  if (pgPool) return pgPool;
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  const sslRequired =
    String(process.env.PGSSLMODE || '').toLowerCase() === 'require' ||
    /sslmode=require/i.test(connectionString);
  pgPool = new PgPool({
    connectionString: connectionString || undefined,
    host: connectionString ? undefined : process.env.PGHOST,
    port: connectionString ? undefined : Number(process.env.PGPORT || 5432),
    user: connectionString ? undefined : process.env.PGUSER,
    password: connectionString ? undefined : process.env.PGPASSWORD,
    database: connectionString ? undefined : process.env.PGDATABASE,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined
  });
  return pgPool;
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

function rewriteSqlForPostgres(sql) {
  let out = '';
  let inSingle = false;
  let paramIndex = 0;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "'") {
      if (inSingle && sql[i + 1] === "'") {
        out += "''";
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      out += ch;
      continue;
    }
    if (ch === '?' && !inSingle) {
      paramIndex += 1;
      out += `$${paramIndex}`;
      continue;
    }
    out += ch;
  }
  return out;
}

function appendReturning(sql, column) {
  const q = String(sql);
  if (/returning\s+/i.test(q)) return q;
  return `${q} RETURNING ${column}`;
}

async function query(sql, params, options) {
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

  if (usePostgres) {
    try {
      initPostgresPool();
      const isSelect = q.toUpperCase().startsWith('SELECT');
      const wantsReturning = options && options.returning;
      const returnColumn = wantsReturning ? String(options.returning || 'id') : 'id';
      const pgSql = wantsReturning ? appendReturning(sql, returnColumn) : sql;
      const pgQuery = rewriteSqlForPostgres(pgSql);
      const result = await pgPool.query(pgQuery, params || []);
      if (isSelect) return result.rows || [];
      if (wantsReturning) {
        return { insertId: result.rows?.[0]?.[returnColumn] ?? null, rows: result.rows || [] };
      }
      return { rowCount: result.rowCount || 0 };
    } catch (err) {
      const code = err && err.code ? err.code : null;
      if (
        allowSqliteFallback &&
        (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || String(err).toLowerCase().includes('connect'))
      ) {
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
      console.warn('DB query error:', err.code || err.message);
      if (q.toUpperCase().startsWith('SELECT')) return [];
      throw err;
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
    if (
      allowSqliteFallback &&
      (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || String(err).toLowerCase().includes('connect'))
    ) {
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

function isPostgres() {
  return usePostgres;
}

function getDbType() {
  if (usePostgres) return 'postgres';
  if (useSqlite) return 'sqlite';
  return 'mysql';
}

module.exports = {
  query,
  isPostgres,
  getDbType
};
