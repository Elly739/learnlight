const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret-dev';

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const users = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length) return res.status(400).json({ error: 'Email already used' });

    const hash = await bcrypt.hash(password, 10);
    const result = await query('INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, NOW())', [name || null, email, hash]);
    const userId = result.insertId;
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const users = await query('SELECT id, password_hash FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
