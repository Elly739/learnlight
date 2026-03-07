const express = require('express');
const { query } = require('../db');
const lessonCatalog = require('../lessonCatalog');
const { requireAuth } = require('../middleware/auth');
const { ensureProgressTables, markLessonComplete } = require('../progressStore');

const router = express.Router();

router.use(requireAuth);

function asDateTimeSql(d) {
  const iso = d.toISOString().slice(0, 19);
  return iso.replace('T', ' ');
}

async function ensureUserCohortColumn() {
  try {
    await query('ALTER TABLE users ADD COLUMN cohort TEXT');
  } catch (e) {}
  try {
    await query('ALTER TABLE users ADD COLUMN cohort VARCHAR(120) NULL');
  } catch (e) {}
}

async function ensureLearnerDownloadTable() {
  try {
    await query(
      'CREATE TABLE IF NOT EXISTS learner_downloads (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, lesson_id INTEGER NOT NULL, filename TEXT NOT NULL, url TEXT, description TEXT, subject_name TEXT, download_type TEXT, status TEXT DEFAULT "downloaded", file_size_bytes INTEGER DEFAULT 0, last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
    );
    return;
  } catch (err) {
    // MySQL fallback
  }
  await query(
    'CREATE TABLE IF NOT EXISTS learner_downloads (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NOT NULL, lesson_id INT UNSIGNED NOT NULL, filename VARCHAR(255) NOT NULL, url VARCHAR(1000) NULL, description TEXT NULL, subject_name VARCHAR(255) NULL, download_type VARCHAR(32) NULL, status VARCHAR(32) NOT NULL DEFAULT "downloaded", file_size_bytes BIGINT NOT NULL DEFAULT 0, last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
  );
}

router.get('/me', async (req, res, next) => {
  try {
    await ensureProgressTables();
    await ensureLearnerDownloadTable();
    const userId = Number(req.user.id);

    const completions = await query(
      'SELECT lesson_id, completed_at FROM lesson_completions WHERE user_id = ? ORDER BY lesson_id ASC',
      [userId]
    );
    const completedLessonIds = completions.map((r) => Number(r.lesson_id));

    const attempts = await query(
      'SELECT id, lesson_id, quiz_id, score, total, created_at FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC, id DESC',
      [userId]
    );
    const latestByLesson = new Map();
    for (const row of attempts) {
      const lessonId = Number(row.lesson_id);
      if (latestByLesson.has(lessonId)) continue;
      const score = Number(row.score) || 0;
      const total = Number(row.total) || 0;
      const percent = total > 0 ? Math.round((score / total) * 100) : 0;
      latestByLesson.set(lessonId, {
        lessonId,
        quizId: Number(row.quiz_id) || null,
        score,
        total,
        percent,
        attemptedAt: row.created_at || null
      });
    }

    const latestQuizByLesson = Array.from(latestByLesson.values()).sort(
      (a, b) => a.lessonId - b.lessonId
    );
    const passedQuizLessonIds = latestQuizByLesson
      .filter((r) => r.percent >= 60)
      .map((r) => r.lessonId);

    const streakRows = await query(
      'SELECT current_streak, longest_streak, last_active_date FROM streaks WHERE user_id = ?',
      [userId]
    );
    const streak = streakRows[0] || {};

    const certRows = await query(
      'SELECT cert_id, lesson_id, issued_at FROM certificates WHERE user_id = ? ORDER BY issued_at DESC',
      [userId]
    );

    const downloadCounts = await query(
      `SELECT
        SUM(CASE WHEN download_type = 'lesson' THEN 1 ELSE 0 END) AS lesson_packages,
        SUM(CASE WHEN download_type = 'subject' THEN 1 ELSE 0 END) AS subject_downloads
      FROM learner_downloads
      WHERE user_id = ?`,
      [userId]
    );
    const dl = downloadCounts[0] || {};
    const downloadedLessonPackages = Number(dl.lesson_packages) || 0;
    const downloadedSubjects = Number(dl.subject_downloads) || 0;

    const lessonById = new Map(lessonCatalog.map((l) => [Number(l.id), l]));
    const certificates = certRows.map((row) => {
      const lessonId = Number(row.lesson_id);
      const lesson = lessonById.get(lessonId);
      return {
        certId: row.cert_id,
        lessonId,
        lessonTitle: lesson ? lesson.title : `Lesson ${lessonId}`,
        issuedAt: row.issued_at || null
      };
    });

    res.json({
      totalLessons: lessonCatalog.length,
      completedLessonIds,
      latestQuizByLesson,
      passedQuizLessonIds,
      downloadedLessonPackages,
      downloadedSubjects,
      currentStreak: Number(streak.current_streak) || 0,
      longestStreak: Number(streak.longest_streak) || 0,
      certificates
    });
  } catch (err) {
    next(err);
  }
});

router.post('/quiz-attempt', async (req, res, next) => {
  try {
    await ensureProgressTables();
    const userId = Number(req.user.id);
    const { lessonId, quizId, score, total, answers, review } = req.body || {};

    if (!lessonId || total == null || score == null) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const safeLessonId = Number(lessonId);
    const safeQuizId = quizId == null ? null : Number(quizId);
    const safeScore = Number(score) || 0;
    const safeTotal = Number(total) || 0;

    await query(
      'INSERT INTO quiz_attempts (user_id, lesson_id, quiz_id, score, total, answers_json, feedback_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [
        userId,
        safeLessonId,
        safeQuizId,
        safeScore,
        safeTotal,
        JSON.stringify(answers || []),
        JSON.stringify(review || [])
      ]
    );

    const { cert, streak } = await markLessonComplete(userId, safeLessonId);

    res.json({
      recorded: true,
      completedLessonId: safeLessonId,
      certId: cert.cert_id || cert.certId || null,
      streak
    });
  } catch (err) {
    next(err);
  }
});

router.get('/quiz-attempts/:lessonId', async (req, res, next) => {
  try {
    await ensureProgressTables();
    const userId = Number(req.user.id);
    const lessonId = Number(req.params.lessonId);
    const rows = await query(
      'SELECT id, lesson_id, quiz_id, score, total, answers_json, feedback_json, created_at FROM quiz_attempts WHERE user_id = ? AND lesson_id = ? ORDER BY created_at DESC, id DESC',
      [userId, lessonId]
    );
    res.json(
      (rows || []).map((row) => {
        let answers = [];
        let review = [];
        try {
          answers = row.answers_json ? JSON.parse(row.answers_json) : [];
        } catch (e) {}
        try {
          review = row.feedback_json ? JSON.parse(row.feedback_json) : [];
        } catch (e) {}
        return {
          id: row.id,
          lesson_id: row.lesson_id,
          quiz_id: row.quiz_id,
          score: row.score,
          total: row.total,
          created_at: row.created_at,
          answers,
          review
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    await ensureProgressTables();
    await ensureUserCohortColumn();
    const userId = Number(req.user.id);
    const windowDays = Math.max(1, Math.min(30, Number(req.query.windowDays) || 7));
    const scope = String(req.query.scope || 'global').toLowerCase();
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - windowDays);
    const fromSql = asDateTimeSql(from);

    const meRows = await query('SELECT cohort FROM users WHERE id = ?', [userId]);
    const myCohort = meRows[0]?.cohort || null;
    const cohortFilter = scope === 'mine' ? myCohort : (req.query.cohort || null);

    const rows = await query(
      `SELECT
        u.id AS user_id,
        u.name AS name,
        u.email AS email,
        u.cohort AS cohort,
        COUNT(DISTINCT lc.lesson_id) AS lessons_completed_week,
        COUNT(qa.id) AS attempts_count,
        AVG(CASE WHEN qa.total > 0 THEN (qa.score * 100.0 / qa.total) ELSE NULL END) AS avg_quiz_percent
      FROM users u
      LEFT JOIN lesson_completions lc
        ON lc.user_id = u.id AND lc.completed_at >= ?
      LEFT JOIN quiz_attempts qa
        ON qa.user_id = u.id AND qa.created_at >= ?
      WHERE (? IS NULL OR u.cohort = ?)
      GROUP BY u.id, u.name, u.email, u.cohort`,
      [fromSql, fromSql, cohortFilter, cohortFilter]
    );

    const entries = (rows || [])
      .map((row) => {
        const lessonsCompleted = Number(row.lessons_completed_week) || 0;
        const avgQuizPercent = Math.round(Number(row.avg_quiz_percent) || 0);
        const attemptsCount = Number(row.attempts_count) || 0;
        return {
          userId: Number(row.user_id),
          name: row.name || null,
          email: row.email || null,
          cohort: row.cohort || null,
          lessonsCompleted,
          avgQuizPercent,
          attemptsCount
        };
      })
      .filter((row) => row.lessonsCompleted > 0 || row.attemptsCount > 0)
      .sort((a, b) => {
        if (b.lessonsCompleted !== a.lessonsCompleted) return b.lessonsCompleted - a.lessonsCompleted;
        if (b.avgQuizPercent !== a.avgQuizPercent) return b.avgQuizPercent - a.avgQuizPercent;
        return b.attemptsCount - a.attemptsCount;
      })
      .map((row, idx) => ({ ...row, rank: idx + 1 }));

    const me = entries.find((e) => Number(e.userId) === userId) || null;
    const top = entries.slice(0, 10);

    res.json({
      windowDays,
      from: fromSql,
      scope,
      cohort: cohortFilter,
      top,
      me
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
