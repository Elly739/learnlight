require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Sentry = require('@sentry/node');
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
const { query, getDbType } = require('./db');

function buildCorsOptions() {
  const raw = String(process.env.ALLOWED_ORIGINS || '').trim();
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  const isProd = env === 'production';
  if (!raw) {
    return isProd
      ? { origin: false }
      : {
          origin: true
        };
  }
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
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
    credentials: false
  };
}

function createApp() {
  const app = express();
  const sentryDsn = String(process.env.SENTRY_DSN || '').trim();
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development'
    });
  }
  app.use(helmet());
  const corsOptions = buildCorsOptions();
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    req.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  });
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const payload = {
        level: ms >= 1000 ? 'warn' : 'info',
        msg: 'http_request',
        requestId: req.requestId || null,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: ms,
        ip: req.ip || null,
        userAgent: req.headers['user-agent'] || null
      };
      if (ms >= 1000) {
        console.warn(JSON.stringify(payload));
      } else {
        console.log(JSON.stringify(payload));
      }
    });
    next();
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false
  });
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(globalLimiter);
  app.use('/api/auth', authLimiter);

  app.get('/', (req, res) =>
    res.json({
      service: 'learnlight-backend',
      status: 'ok',
      health: '/api/health'
    })
  );

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/health/db', async (req, res) => {
    try {
      await query('SELECT 1');
      res.json({ ok: true, db: getDbType() });
    } catch (err) {
      res.status(500).json({ ok: false, db: getDbType(), error: err.message || 'DB error' });
    }
  });

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
    const payload = {
      level: 'error',
      msg: 'error',
      requestId: req.requestId || null,
      path: req.originalUrl,
      method: req.method,
      error: err?.message || 'Server error'
    };
    if (sentryDsn) {
      Sentry.withScope((scope) => {
        scope.setTag('request_id', req.requestId || 'none');
        scope.setContext('request', {
          method: req.method,
          path: req.originalUrl,
          status: err.status || 500
        });
        Sentry.captureException(err);
      });
    }
    console.error(JSON.stringify(payload));
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
