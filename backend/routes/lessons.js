const express = require('express');
const { query } = require('../db');
const router = express.Router();

// List lessons
router.get('/', async (req, res, next) => {
  try {
    const rows = await query('SELECT id, title, slug, description FROM lessons ORDER BY `order` ASC');
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

// Get lesson by id
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const rows = await query('SELECT * FROM lessons WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Get lesson by slug
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const rows = await query('SELECT * FROM lessons WHERE slug = ?', [slug]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
