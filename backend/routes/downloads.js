const express = require('express');
const { query } = require('../db');
const router = express.Router();

// List all downloads
router.get('/', async (req, res, next) => {
  try {
    const rows = await query('SELECT id, lesson_id, filename, url, description FROM downloads ORDER BY id DESC');
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

// List downloads for a lesson
router.get('/lesson/:lessonId', async (req, res, next) => {
  try {
    const lessonId = req.params.lessonId;
    const rows = await query('SELECT id, filename, url, description FROM downloads WHERE lesson_id = ? ORDER BY id DESC', [lessonId]);
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
