const express = require('express');
const { query } = require('../db');
const lessonCatalog = require('../lessonCatalog');
const { ensureProgressTables } = require('../progressStore');

const router = express.Router();

router.get('/verify/:certId', async (req, res, next) => {
  try {
    await ensureProgressTables();
    const certId = req.params.certId;
    const rows = await query(
      'SELECT c.cert_id, c.lesson_id, c.issued_at, u.name, u.email FROM certificates c LEFT JOIN users u ON u.id = c.user_id WHERE c.cert_id = ?',
      [certId]
    );
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Certificate not found' });

    const row = rows[0];
    const lesson = lessonCatalog.find((l) => Number(l.id) === Number(row.lesson_id));
    res.json({
      valid: true,
      certId: row.cert_id,
      lessonId: Number(row.lesson_id),
      lessonTitle: lesson ? lesson.title : `Lesson ${row.lesson_id}`,
      learnerName: row.name || null,
      learnerEmail: row.email || null,
      issuedAt: row.issued_at || null
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
