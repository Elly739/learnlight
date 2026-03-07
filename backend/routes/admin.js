const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ensureContentTables } = require('../contentStore');
const { ensureProgressTables } = require('../progressStore');
const lessonCatalog = require('../lessonCatalog');

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'editor', 'support'));

const ROLE_PERMISSIONS = {
  admin: new Set(['*']),
  editor: new Set([
    'content.read',
    'content.write',
    'workflow.write',
    'analytics.read',
    'export.read',
    'certificates.read',
    'users.read'
  ]),
  support: new Set([
    'users.read',
    'users.write',
    'users.progress.read',
    'certificates.read',
    'certificates.write',
    'audit.read',
    'export.read',
    'enrollments.write'
  ])
};

function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || new Set();
  return perms.has('*') || perms.has(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    const role = req.user?.role || 'student';
    if (!hasPermission(role, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

async function ensureAdminMetaTables() {
  try {
    await query(
      'CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id INTEGER, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, details_json TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
    );
    await query(
      'CREATE TABLE IF NOT EXISTS site_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
    );
    try {
      await query('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1');
    } catch (e) {}
    try {
      await query('ALTER TABLE users ADD COLUMN cohort TEXT');
    } catch (e) {}
    return;
  } catch (err) {
    // mysql fallback
  }

  await query(
    'CREATE TABLE IF NOT EXISTS audit_logs (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, actor_user_id INT UNSIGNED NULL, action VARCHAR(255) NOT NULL, entity_type VARCHAR(120) NULL, entity_id VARCHAR(120) NULL, details_json LONGTEXT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
  );
  await query(
    'CREATE TABLE IF NOT EXISTS site_settings (setting_key VARCHAR(120) NOT NULL PRIMARY KEY, setting_value LONGTEXT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)'
  );
  try {
    await query('ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
  } catch (e) {}
  try {
    await query('ALTER TABLE users ADD COLUMN cohort VARCHAR(120) NULL');
  } catch (e) {}
}

async function logAudit(req, action, entityType, entityId, details = null) {
  await ensureAdminMetaTables();
  await query(
    'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [
      Number(req.user?.id) || null,
      String(action || ''),
      entityType || null,
      entityId == null ? null : String(entityId),
      details ? JSON.stringify(details) : null
    ]
  );
}

function csvEscape(value) {
  const v = value == null ? '' : String(value);
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function toCsv(rows, headers) {
  const head = headers.map((h) => csvEscape(h)).join(',');
  const lines = rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','));
  return [head, ...lines].join('\n');
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsvText(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] == null ? '' : cols[idx];
    });
    return row;
  });
  return { headers, rows };
}

router.get('/certificates/search', requirePermission('certificates.read'), async (req, res, next) => {
  try {
    await ensureProgressTables();
    const rawQ = String(req.query.q || '').trim();
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
    const likeQ = `%${rawQ}%`;

    const rows = rawQ
      ? await query(
          `SELECT c.cert_id, c.lesson_id, c.issued_at, u.id AS user_id, u.name, u.email
           FROM certificates c
           LEFT JOIN users u ON u.id = c.user_id
           WHERE c.cert_id LIKE ? OR u.email LIKE ? OR u.name LIKE ?
           ORDER BY c.issued_at DESC
           LIMIT ${limit}`,
          [likeQ, likeQ, likeQ]
        )
      : await query(
          `SELECT c.cert_id, c.lesson_id, c.issued_at, u.id AS user_id, u.name, u.email
           FROM certificates c
           LEFT JOIN users u ON u.id = c.user_id
           ORDER BY c.issued_at DESC
           LIMIT ${limit}`
        );

    const lessonTitleMap = new Map(lessonCatalog.map((l) => [Number(l.id), l.title]));
    const results = (rows || []).map((row) => ({
      certId: row.cert_id,
      lessonId: Number(row.lesson_id),
      lessonTitle: lessonTitleMap.get(Number(row.lesson_id)) || `Lesson ${row.lesson_id}`,
      issuedAt: row.issued_at || null,
      learner: {
        id: row.user_id ? Number(row.user_id) : null,
        name: row.name || null,
        email: row.email || null
      }
    }));

    res.json({ query: rawQ, count: results.length, results });
  } catch (err) {
    next(err);
  }
});

router.get('/users', requirePermission('users.read'), async (req, res, next) => {
  try {
    await ensureAdminMetaTables();
    const q = String(req.query.q || '').trim();
    const likeQ = `%${q}%`;
    const rows = q
      ? await query(
          'SELECT id, name, email, role, cohort, is_active, created_at FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY id DESC',
          [likeQ, likeQ]
        )
      : await query(
          'SELECT id, name, email, role, cohort, is_active, created_at FROM users ORDER BY id DESC'
        );
    res.json(
      (rows || []).map((r) => ({
        id: Number(r.id),
        name: r.name || '',
        email: r.email || '',
        role: r.role || 'student',
        cohort: r.cohort || '',
        isActive: r.is_active == null ? true : Number(r.is_active) === 1,
        createdAt: r.created_at || null
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.put('/users/:userId', requirePermission('users.write'), async (req, res, next) => {
  try {
    await ensureAdminMetaTables();
    const userId = Number(req.params.userId);
    const role = String(req.body?.role || 'student');
    const cohort = String(req.body?.cohort || '').trim() || null;
    const isActive = req.body?.isActive == null ? true : Boolean(req.body.isActive);
    const allowedRoles = new Set(['admin', 'student', 'editor', 'support']);
    const safeRole = allowedRoles.has(role) ? role : 'student';

    await query(
      'UPDATE users SET role = ?, cohort = ?, is_active = ? WHERE id = ?',
      [safeRole, cohort, isActive ? 1 : 0, userId]
    );
    await logAudit(req, 'user.updated', 'user', userId, { role: safeRole, cohort, isActive });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:userId/progress', requirePermission('users.progress.read'), async (req, res, next) => {
  try {
    await ensureProgressTables();
    const userId = Number(req.params.userId);
    const completions = await query(
      'SELECT lesson_id, completed_at FROM lesson_completions WHERE user_id = ? ORDER BY completed_at DESC',
      [userId]
    );
    const attempts = await query(
      'SELECT id, lesson_id, quiz_id, score, total, created_at FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    const streakRows = await query(
      'SELECT current_streak, longest_streak, last_active_date FROM streaks WHERE user_id = ?',
      [userId]
    );
    const certRows = await query(
      'SELECT cert_id, lesson_id, issued_at FROM certificates WHERE user_id = ? ORDER BY issued_at DESC',
      [userId]
    );
    res.json({
      completedLessonIds: (completions || []).map((c) => Number(c.lesson_id)),
      completions: completions || [],
      attempts: attempts || [],
      streak: streakRows[0] || null,
      certificates: certRows || []
    });
  } catch (err) {
    next(err);
  }
});

router.post('/enrollments', requirePermission('enrollments.write'), async (req, res, next) => {
  try {
    const userId = Number(req.body?.userId);
    const lessonId = Number(req.body?.lessonId);
    const enrolled = req.body?.enrolled == null ? true : Boolean(req.body.enrolled);
    if (!userId || !lessonId) return res.status(400).json({ error: 'Missing fields' });

    try {
      await query(
        'CREATE TABLE IF NOT EXISTS lesson_enrollments (user_id INTEGER NOT NULL, lesson_id INTEGER NOT NULL, enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, lesson_id))'
      );
    } catch (e) {
      await query(
        'CREATE TABLE IF NOT EXISTS lesson_enrollments (user_id INT UNSIGNED NOT NULL, lesson_id INT UNSIGNED NOT NULL, enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, lesson_id))'
      );
    }

    if (enrolled) {
      const rows = await query(
        'SELECT lesson_id FROM lesson_enrollments WHERE user_id = ? AND lesson_id = ?',
        [userId, lessonId]
      );
      if (!rows.length) {
        await query(
          'INSERT INTO lesson_enrollments (user_id, lesson_id, enrolled_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [userId, lessonId]
        );
      }
    } else {
      await query(
        'DELETE FROM lesson_enrollments WHERE user_id = ? AND lesson_id = ?',
        [userId, lessonId]
      );
    }
    await logAudit(req, 'enrollment.updated', 'lesson_enrollment', `${userId}:${lessonId}`, {
      userId,
      lessonId,
      enrolled
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/quiz', requirePermission('analytics.read'), async (req, res, next) => {
  try {
    await ensureProgressTables();
    const rows = await query(
      `SELECT
        lesson_id,
        COUNT(*) AS attempts_count,
        AVG(CASE WHEN total > 0 THEN (score * 100.0 / total) ELSE NULL END) AS avg_percent
      FROM quiz_attempts
      GROUP BY lesson_id
      ORDER BY attempts_count DESC`
    );
    const byLesson = (rows || []).map((r) => {
      const lesson = lessonCatalog.find((l) => Number(l.id) === Number(r.lesson_id));
      return {
        lessonId: Number(r.lesson_id),
        lessonTitle: lesson ? lesson.title : `Lesson ${r.lesson_id}`,
        attemptsCount: Number(r.attempts_count) || 0,
        avgPercent: Math.round(Number(r.avg_percent) || 0)
      };
    });
    res.json({ byLesson });
  } catch (err) {
    next(err);
  }
});

router.post('/certificates/revoke/:certId', requirePermission('certificates.write'), async (req, res, next) => {
  try {
    await ensureProgressTables();
    const certId = String(req.params.certId || '');
    await query('DELETE FROM certificates WHERE cert_id = ?', [certId]);
    await logAudit(req, 'certificate.revoked', 'certificate', certId, null);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/certificates/regenerate/:certId', requirePermission('certificates.write'), async (req, res, next) => {
  try {
    await ensureProgressTables();
    const certId = String(req.params.certId || '');
    const rows = await query('SELECT user_id, lesson_id FROM certificates WHERE cert_id = ?', [certId]);
    if (!rows.length) return res.status(404).json({ error: 'Certificate not found' });
    await query('DELETE FROM certificates WHERE cert_id = ?', [certId]);
    const { user_id, lesson_id } = rows[0];
    const newCertId = `LL-${user_id}-${lesson_id}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await query(
      'INSERT INTO certificates (cert_id, user_id, lesson_id, issued_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [newCertId, Number(user_id), Number(lesson_id)]
    );
    await logAudit(req, 'certificate.regenerated', 'certificate', certId, { newCertId });
    res.json({ ok: true, newCertId });
  } catch (err) {
    next(err);
  }
});

router.get('/audit-logs', requirePermission('audit.read'), async (req, res, next) => {
  try {
    await ensureAdminMetaTables();
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100));
    const rows = await query(
      `SELECT id, actor_user_id, action, entity_type, entity_id, details_json, created_at
       FROM audit_logs
       ORDER BY id DESC
       LIMIT ${limit}`
    );
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

router.get('/settings', requirePermission('settings.write'), async (req, res, next) => {
  try {
    await ensureAdminMetaTables();
    const rows = await query('SELECT setting_key, setting_value FROM site_settings');
    const settings = {};
    for (const row of rows || []) {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch (e) {
        settings[row.setting_key] = row.setting_value;
      }
    }
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', requirePermission('settings.write'), async (req, res, next) => {
  try {
    await ensureAdminMetaTables();
    const updates = req.body?.settings || {};
    const keys = Object.keys(updates);
    for (const key of keys) {
      const value = JSON.stringify(updates[key]);
      const existing = await query('SELECT setting_key FROM site_settings WHERE setting_key = ?', [key]);
      if (existing.length) {
        await query(
          'UPDATE site_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
          [value, key]
        );
      } else {
        await query(
          'INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, value]
        );
      }
    }
    await logAudit(req, 'settings.updated', 'site_settings', null, { keys });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/export/users.csv', requirePermission('export.read'), async (req, res, next) => {
  try {
    await ensureAdminMetaTables();
    const rows = await query(
      'SELECT id, name, email, role, cohort, is_active, created_at FROM users ORDER BY id ASC'
    );
    const csv = toCsv(rows || [], ['id', 'name', 'email', 'role', 'cohort', 'is_active', 'created_at']);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/export/lessons.csv', requirePermission('export.read'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const rows = await query(
      'SELECT id, title, slug, description, lesson_order, estimated_minutes, is_published, workflow_status FROM managed_lessons ORDER BY lesson_order ASC, id ASC'
    );
    const csv = toCsv(rows || [], ['id', 'title', 'slug', 'description', 'lesson_order', 'estimated_minutes', 'is_published', 'workflow_status']);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lessons.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/lessons', requirePermission('content.read'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessons = await query(
      'SELECT id, title, slug, description, lesson_order, estimated_minutes, is_published, workflow_status FROM managed_lessons ORDER BY lesson_order ASC, id ASC'
    );
    res.json(lessons || []);
  } catch (err) {
    next(err);
  }
});

router.post('/lessons', requirePermission('content.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const { title, slug, description, lessonOrder, estimatedMinutes, isPublished, workflowStatus } = req.body || {};
    if (!title || !slug) return res.status(400).json({ error: 'Missing fields' });
    const safeWorkflow = workflowStatus || (isPublished ? 'published' : 'draft');
    const safeEstimate = Math.max(15, Number(estimatedMinutes) || 90);

    const result = await query(
      'INSERT INTO managed_lessons (title, slug, description, lesson_order, estimated_minutes, is_published, workflow_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [title, slug, description || '', Number(lessonOrder) || 0, safeEstimate, isPublished ? 1 : 0, safeWorkflow]
    );
    await logAudit(req, 'lesson.created', 'lesson', result.insertId || result.lastID || null, {
      title,
      slug,
      workflowStatus: safeWorkflow
    });
    res.json({ id: result.insertId || result.lastID || null });
  } catch (err) {
    next(err);
  }
});

router.put('/lessons/:lessonId', requirePermission('content.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessonId = Number(req.params.lessonId);
    const { title, slug, description, lessonOrder, estimatedMinutes, isPublished, workflowStatus } = req.body || {};
    const safeEstimate =
      estimatedMinutes == null ? null : Math.max(15, Number(estimatedMinutes) || 90);
    await query(
      'UPDATE managed_lessons SET title = ?, slug = ?, description = ?, lesson_order = ?, estimated_minutes = COALESCE(?, estimated_minutes), is_published = ?, workflow_status = COALESCE(?, workflow_status), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, slug, description || '', Number(lessonOrder) || 0, safeEstimate, isPublished ? 1 : 0, workflowStatus || null, lessonId]
    );
    await logAudit(req, 'lesson.updated', 'lesson', lessonId, { title, slug, workflowStatus });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/lessons/:lessonId/workflow/submit-review', requirePermission('workflow.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessonId = Number(req.params.lessonId);
    await query(
      'UPDATE managed_lessons SET workflow_status = ?, is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['in_review', lessonId]
    );
    await logAudit(req, 'lesson.workflow.submit_review', 'lesson', lessonId, null);
    res.json({ ok: true, workflowStatus: 'in_review' });
  } catch (err) {
    next(err);
  }
});

router.post('/lessons/:lessonId/workflow/approve', requirePermission('workflow.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessonId = Number(req.params.lessonId);
    await query(
      'UPDATE managed_lessons SET workflow_status = ?, is_published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['published', lessonId]
    );
    await logAudit(req, 'lesson.workflow.approve', 'lesson', lessonId, null);
    res.json({ ok: true, workflowStatus: 'published' });
  } catch (err) {
    next(err);
  }
});

router.post('/lessons/:lessonId/workflow/reject', requirePermission('workflow.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessonId = Number(req.params.lessonId);
    await query(
      'UPDATE managed_lessons SET workflow_status = ?, is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['draft', lessonId]
    );
    await logAudit(req, 'lesson.workflow.reject', 'lesson', lessonId, null);
    res.json({ ok: true, workflowStatus: 'draft' });
  } catch (err) {
    next(err);
  }
});

router.delete('/lessons/:lessonId', requirePermission('content.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessonId = Number(req.params.lessonId);
    const quizzes = await query('SELECT id FROM managed_quizzes WHERE lesson_id = ?', [lessonId]);
    for (const q of quizzes) {
      const questions = await query('SELECT id FROM managed_questions WHERE quiz_id = ?', [q.id]);
      for (const question of questions) {
        await query('DELETE FROM managed_options WHERE question_id = ?', [question.id]);
      }
      await query('DELETE FROM managed_questions WHERE quiz_id = ?', [q.id]);
    }
    await query('DELETE FROM managed_quizzes WHERE lesson_id = ?', [lessonId]);
    await query('DELETE FROM managed_subjects WHERE lesson_id = ?', [lessonId]);
    await query('DELETE FROM managed_lessons WHERE id = ?', [lessonId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/lessons/:lessonId/subjects', requirePermission('content.read'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessonId = Number(req.params.lessonId);
    const rows = await query(
      'SELECT id, subject_key, name, description, content_text, subject_order FROM managed_subjects WHERE lesson_id = ? ORDER BY subject_order ASC, id ASC',
      [lessonId]
    );
    res.json(rows || []);
  } catch (err) {
    next(err);
  }
});

router.post('/lessons/:lessonId/subjects', requirePermission('content.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessonId = Number(req.params.lessonId);
    const { subjectKey, name, description, content, subjectOrder } = req.body || {};
    if (!subjectKey || !name) return res.status(400).json({ error: 'Missing fields' });
    const result = await query(
      'INSERT INTO managed_subjects (lesson_id, subject_key, name, description, content_text, subject_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [lessonId, subjectKey, name, description || '', content || '', Number(subjectOrder) || 0]
    );
    res.json({ id: result.insertId || result.lastID || null });
  } catch (err) {
    next(err);
  }
});

router.delete('/subjects/:subjectId', requirePermission('content.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    await query('DELETE FROM managed_subjects WHERE id = ?', [Number(req.params.subjectId)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.put('/subjects/:subjectId', requirePermission('content.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const subjectId = Number(req.params.subjectId);
    const { subjectKey, name, description, content, subjectOrder } = req.body || {};
    await query(
      'UPDATE managed_subjects SET subject_key = ?, name = ?, description = ?, content_text = ?, subject_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subjectKey, name, description || '', content || '', Number(subjectOrder) || 0, subjectId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/lessons/:lessonId/quiz', requirePermission('content.read'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessonId = Number(req.params.lessonId);
    const quizzes = await query(
      'SELECT id, title, is_published FROM managed_quizzes WHERE lesson_id = ? ORDER BY id DESC',
      [lessonId]
    );
    if (!quizzes.length) return res.json({ quiz: null });
    const quiz = quizzes[0];
    const questions = await query(
      'SELECT id, question_text, explanation, question_order FROM managed_questions WHERE quiz_id = ? ORDER BY question_order ASC, id ASC',
      [quiz.id]
    );
    for (const q of questions) {
      q.options = await query(
        'SELECT id, option_text, is_correct, option_order FROM managed_options WHERE question_id = ? ORDER BY option_order ASC, id ASC',
        [q.id]
      );
    }
    res.json({ quiz: { ...quiz, questions } });
  } catch (err) {
    next(err);
  }
});

router.post('/lessons/:lessonId/quiz', requirePermission('content.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const lessonId = Number(req.params.lessonId);
    const { title, questions } = req.body || {};
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'Invalid questions' });

    const existing = await query('SELECT id FROM managed_quizzes WHERE lesson_id = ?', [lessonId]);
    let quizId = null;

    if (existing.length) {
      quizId = Number(existing[0].id);
      const prevQuestions = await query('SELECT id FROM managed_questions WHERE quiz_id = ?', [quizId]);
      for (const q of prevQuestions) {
        await query('DELETE FROM managed_options WHERE question_id = ?', [q.id]);
      }
      await query('DELETE FROM managed_questions WHERE quiz_id = ?', [quizId]);
      await query('UPDATE managed_quizzes SET title = ?, is_published = 1 WHERE id = ?', [title || 'Quiz', quizId]);
    } else {
      const insertQuiz = await query(
        'INSERT INTO managed_quizzes (lesson_id, title, is_published, created_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)',
        [lessonId, title || 'Quiz']
      );
      quizId = insertQuiz.insertId || insertQuiz.lastID;
    }

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const insertQuestion = await query(
        'INSERT INTO managed_questions (quiz_id, question_text, explanation, question_order) VALUES (?, ?, ?, ?)',
        [quizId, q.question_text || '', q.explanation || '', i]
      );
      const questionId = insertQuestion.insertId || insertQuestion.lastID;
      const options = Array.isArray(q.options) ? q.options : [];
      for (let j = 0; j < options.length; j += 1) {
        const option = options[j];
        await query(
          'INSERT INTO managed_options (question_id, option_text, is_correct, option_order) VALUES (?, ?, ?, ?)',
          [questionId, option.option_text || '', option.is_correct ? 1 : 0, j]
        );
      }
    }

    res.json({ ok: true, quizId });
  } catch (err) {
    next(err);
  }
});

router.post('/import/lessons-csv', requirePermission('content.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const csvText = req.body?.csvText;
    if (!csvText) return res.status(400).json({ error: 'csvText is required' });

    const { headers, rows } = parseCsvText(csvText);
    if (!headers.length || !rows.length) {
      return res.status(400).json({ error: 'CSV is empty or invalid' });
    }

    let created = 0;
    let updated = 0;
    for (const row of rows) {
      const title = String(row.title || '').trim();
      const slug = String(row.slug || '').trim();
      if (!title || !slug) continue;

      const description = String(row.description || '');
      const lessonOrder = Number(row.lesson_order || row.lessonOrder || 0) || 0;
      const estimatedMinutes = Math.max(15, Number(row.estimated_minutes || row.estimatedMinutes || 90) || 90);
      const workflowStatus = String(row.workflow_status || row.workflowStatus || '').trim();
      const isPublishedFromCsv = row.is_published ?? row.isPublished;
      const isPublished =
        isPublishedFromCsv == null
          ? workflowStatus === 'published'
          : String(isPublishedFromCsv) === '1' ||
            String(isPublishedFromCsv).toLowerCase() === 'true';
      const safeWorkflow = workflowStatus || (isPublished ? 'published' : 'draft');

      const existing = await query('SELECT id FROM managed_lessons WHERE slug = ?', [slug]);
      if (existing.length) {
        await query(
          'UPDATE managed_lessons SET title = ?, description = ?, lesson_order = ?, estimated_minutes = ?, is_published = ?, workflow_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [title, description, lessonOrder, estimatedMinutes, isPublished ? 1 : 0, safeWorkflow, Number(existing[0].id)]
        );
        updated += 1;
      } else {
        await query(
          'INSERT INTO managed_lessons (title, slug, description, lesson_order, estimated_minutes, is_published, workflow_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [title, slug, description, lessonOrder, estimatedMinutes, isPublished ? 1 : 0, safeWorkflow]
        );
        created += 1;
      }
    }

    await logAudit(req, 'content.import.lessons_csv', 'lesson', null, { created, updated });
    res.json({ ok: true, created, updated, total: created + updated });
  } catch (err) {
    next(err);
  }
});

router.post('/import/subjects-csv', requirePermission('content.write'), async (req, res, next) => {
  try {
    await ensureContentTables();
    const csvText = req.body?.csvText;
    if (!csvText) return res.status(400).json({ error: 'csvText is required' });

    const { headers, rows } = parseCsvText(csvText);
    if (!headers.length || !rows.length) {
      return res.status(400).json({ error: 'CSV is empty or invalid' });
    }

    let created = 0;
    let updated = 0;
    for (const row of rows) {
      const lessonSlug = String(row.lesson_slug || row.lessonSlug || '').trim();
      const subjectKey = String(row.subject_key || row.subjectKey || '').trim();
      const name = String(row.name || '').trim();
      if (!lessonSlug || !subjectKey || !name) continue;

      const lessonRows = await query('SELECT id FROM managed_lessons WHERE slug = ?', [lessonSlug]);
      if (!lessonRows.length) continue;
      const lessonId = Number(lessonRows[0].id);
      const description = String(row.description || '');
      const content = String(row.content_text || row.content || '');
      const subjectOrder = Number(row.subject_order || row.subjectOrder || 0) || 0;

      const existing = await query(
        'SELECT id FROM managed_subjects WHERE lesson_id = ? AND subject_key = ?',
        [lessonId, subjectKey]
      );
      if (existing.length) {
        await query(
          'UPDATE managed_subjects SET name = ?, description = ?, content_text = ?, subject_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [name, description, content, subjectOrder, Number(existing[0].id)]
        );
        updated += 1;
      } else {
        await query(
          'INSERT INTO managed_subjects (lesson_id, subject_key, name, description, content_text, subject_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [lessonId, subjectKey, name, description, content, subjectOrder]
        );
        created += 1;
      }
    }

    await logAudit(req, 'content.import.subjects_csv', 'subject', null, { created, updated });
    res.json({ ok: true, created, updated, total: created + updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
