const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret-dev';
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function ensureUsersTable() {
  try {
    // SQLite-compatible definition
    await query(
      'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT DEFAULT "student", created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
    );
    try {
      await query('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "student"');
    } catch (e) {}
    try {
      await query('ALTER TABLE users ADD COLUMN cohort TEXT');
    } catch (e) {}
    return;
  } catch (err) {
    // ignore and try MySQL variant below
  }

  // MySQL-compatible definition
  await query(
    'CREATE TABLE IF NOT EXISTS users (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, role VARCHAR(32) NOT NULL DEFAULT "student", created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
  );
  try {
    await query('ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT "student"');
  } catch (e) {}
  try {
    await query('ALTER TABLE users ADD COLUMN cohort VARCHAR(120) NULL');
  } catch (e) {}
}

router.post('/register', async (req, res, next) => {
  try {
    await ensureUsersTable();
    const { name, email, password, cohort } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const users = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length) return res.status(400).json({ error: 'Email already used' });

    const userCountRows = await query('SELECT id FROM users');
    const isFirstUser = (userCountRows || []).length === 0;
    const role = isFirstUser || ADMIN_EMAILS.includes(String(email).toLowerCase())
      ? 'admin'
      : 'student';
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, email, password_hash, role, cohort, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [name || null, email, hash, role, cohort || null]
    );
    const userId = result.insertId || result.lastID || null;
    const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userId, name: name || null, email, role, cohort: cohort || null } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    await ensureUsersTable();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const users = await query('SELECT id, name, role, cohort, password_hash FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const fallbackAdmin =
      Number(user.id) === 1 || ADMIN_EMAILS.includes(String(email).toLowerCase());
    const role = fallbackAdmin ? 'admin' : (user.role || 'student');
    if (fallbackAdmin && user.role !== 'admin') {
      await query('UPDATE users SET role = ? WHERE id = ?', ['admin', Number(user.id)]);
    }
    const token = jwt.sign({ id: user.id, email, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id || null, name: user.name || null, email, role, cohort: user.cohort || null }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
