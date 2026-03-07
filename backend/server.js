require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const lessonsRoutes = require('./routes/lessons');
const quizRoutes = require('./routes/quiz');
const downloadsRoutes = require('./routes/downloads');
const progressRoutes = require('./routes/progress');
const certificateRoutes = require('./routes/certificates');
const learnerRoutes = require('./routes/learner');
const adminRoutes = require('./routes/admin');
const remindersRoutes = require('./routes/reminders');
const lessonCatalog = require('./lessonCatalog');

function buildCorsOptions() {
  const raw = String(process.env.ALLOWED_ORIGINS || '').trim();
  if (!raw) return {};
  const allowed = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (!allowed.length) return {};

  function toRegexPattern(entry) {
    if (!entry.includes('*')) return null;
    const escaped = entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  const allowedExact = allowed.filter((x) => !x.includes('*'));
  const allowedPatterns = allowed
    .map((x) => toRegexPattern(x))
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // Allow non-browser and same-origin requests without an Origin header.
      if (!origin) return callback(null, true);
      if (allowedExact.includes(origin)) return callback(null, true);
      if (allowedPatterns.some((pattern) => pattern.test(origin))) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    }
  };
}

function createApp() {
  const app = express();
  app.use(cors(buildCorsOptions()));
  app.use(express.json());

  app.get('/', (req, res) =>
    res.json({
      service: 'learnlight-backend',
      status: 'ok',
      health: '/api/health'
    })
  );

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/lessons', lessonsRoutes);
  app.use('/api/quiz', quizRoutes);
  app.use('/api/downloads', downloadsRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/certificates', certificateRoutes);
  app.use('/api/learner', learnerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reminders', remindersRoutes);

  // basic error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  });

  return app;
}

function startServer(port = process.env.PORT || 4000) {
  const app = createApp();
  return app.listen(port, () => {
    const firstLessonTitle = lessonCatalog?.[0]?.title || 'N/A';
    console.log(`Server listening on port ${port}`);
    console.log(`Lesson catalog check: first lesson is "${firstLessonTitle}"`);
  });
}

if (require.main === module) {
  startServer(process.env.PORT || 4000);
}

module.exports = {
  createApp,
  startServer
};
