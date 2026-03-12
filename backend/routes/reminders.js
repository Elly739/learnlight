const express = require('express');
const { query, isPostgres } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { ensureProgressTables } = require('../progressStore');
const { getPublicLessons } = require('../contentStore');

const router = express.Router();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function ensureReminderTables() {
  if (isPostgres()) {
    await query(
      'CREATE TABLE IF NOT EXISTS reminder_preferences (user_id INTEGER PRIMARY KEY, email_enabled BOOLEAN NOT NULL DEFAULT FALSE, push_enabled BOOLEAN NOT NULL DEFAULT TRUE, daily_time TEXT NOT NULL DEFAULT \'18:00\', timezone TEXT NOT NULL DEFAULT \'UTC\', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
    );
    return;
  }
  try {
    await query(
      'CREATE TABLE IF NOT EXISTS reminder_preferences (user_id INTEGER PRIMARY KEY, email_enabled INTEGER NOT NULL DEFAULT 0, push_enabled INTEGER NOT NULL DEFAULT 1, daily_time TEXT NOT NULL DEFAULT "18:00", timezone TEXT NOT NULL DEFAULT "UTC", updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
    );
    return;
  } catch (err) {
    // MySQL fallback below
  }

  await query(
    'CREATE TABLE IF NOT EXISTS reminder_preferences (user_id INT UNSIGNED NOT NULL PRIMARY KEY, email_enabled TINYINT(1) NOT NULL DEFAULT 0, push_enabled TINYINT(1) NOT NULL DEFAULT 1, daily_time VARCHAR(16) NOT NULL DEFAULT "18:00", timezone VARCHAR(64) NOT NULL DEFAULT "UTC", updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)'
  );
}

router.use(requireAuth);

router.get('/preferences', async (req, res, next) => {
  try {
    await ensureReminderTables();
    const userId = Number(req.user.id);
    const rows = await query(
      'SELECT user_id, email_enabled, push_enabled, daily_time, timezone FROM reminder_preferences WHERE user_id = ?',
      [userId]
    );
    if (!rows.length) {
      return res.json({
        emailEnabled: false,
        pushEnabled: true,
        dailyTime: '18:00',
        timezone: 'UTC'
      });
    }
    const row = rows[0];
    res.json({
      emailEnabled: Number(row.email_enabled) === 1,
      pushEnabled: Number(row.push_enabled) === 1,
      dailyTime: row.daily_time || '18:00',
      timezone: row.timezone || 'UTC'
    });
  } catch (err) {
    next(err);
  }
});

router.put('/preferences', async (req, res, next) => {
  try {
    await ensureReminderTables();
    const userId = Number(req.user.id);
    const emailEnabled = Boolean(req.body?.emailEnabled);
    const pushEnabled = Boolean(req.body?.pushEnabled);
    const dailyTime = String(req.body?.dailyTime || '18:00').slice(0, 16);
    const timezone = String(req.body?.timezone || 'UTC').slice(0, 64);
    const emailValue = isPostgres() ? emailEnabled : (emailEnabled ? 1 : 0);
    const pushValue = isPostgres() ? pushEnabled : (pushEnabled ? 1 : 0);

    const rows = await query(
      'SELECT user_id FROM reminder_preferences WHERE user_id = ?',
      [userId]
    );
    if (rows.length) {
      await query(
        'UPDATE reminder_preferences SET email_enabled = ?, push_enabled = ?, daily_time = ?, timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [emailValue, pushValue, dailyTime, timezone, userId]
      );
    } else {
      await query(
        'INSERT INTO reminder_preferences (user_id, email_enabled, push_enabled, daily_time, timezone, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, emailValue, pushValue, dailyTime, timezone]
      );
    }

    res.json({
      ok: true,
      preferences: {
        emailEnabled,
        pushEnabled,
        dailyTime,
        timezone
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/due', async (req, res, next) => {
  try {
    await ensureReminderTables();
    await ensureProgressTables();
    const userId = Number(req.user.id);
    const reminders = [];

    const streakRows = await query(
      'SELECT current_streak, last_active_date FROM streaks WHERE user_id = ?',
      [userId]
    );
    const streak = streakRows[0] || {};
    const lastActiveDate = streak.last_active_date || null;
    const currentStreak = Number(streak.current_streak) || 0;
    if (lastActiveDate !== todayKey()) {
      reminders.push({
        type: 'streak',
        title: 'Keep your streak alive',
        message:
          currentStreak > 0
            ? `You are on a ${currentStreak}-day streak. Complete one lesson activity today to continue it.`
            : 'Start your learning streak today with one lesson activity.'
      });
    }

    const lessons = await getPublicLessons();
    const completions = await query(
      'SELECT lesson_id FROM lesson_completions WHERE user_id = ?',
      [userId]
    );
    const completedSet = new Set((completions || []).map((r) => Number(r.lesson_id)));
    const unfinished = (lessons || []).filter((l) => !completedSet.has(Number(l.id)));

    if (unfinished.length > 0) {
      reminders.push({
        type: 'unfinished',
        title: 'Resume unfinished lessons',
        message: `You have ${unfinished.length} unfinished lesson(s). Next up: ${unfinished
          .slice(0, 2)
          .map((l) => l.title)
          .join(', ')}`
      });
    }

    const prefsRows = await query(
      'SELECT email_enabled, push_enabled, daily_time, timezone FROM reminder_preferences WHERE user_id = ?',
      [userId]
    );
    const prefs = prefsRows[0] || {};

    res.json({
      reminders,
      channels: {
        emailEnabled: Number(prefs.email_enabled) === 1,
        pushEnabled: !prefsRows.length || Number(prefs.push_enabled) === 1
      },
      schedule: {
        dailyTime: prefs.daily_time || '18:00',
        timezone: prefs.timezone || 'UTC'
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
