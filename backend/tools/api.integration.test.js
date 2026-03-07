const test = require('node:test');
const assert = require('node:assert/strict');

const dbFile = `integration-${Date.now()}.sqlite`;
process.env.FORCE_SQLITE = '1';
process.env.SQLITE_PATH = dbFile;
process.env.JWT_SECRET = 'integration-secret';
process.env.ADMIN_EMAILS = 'integration.admin@example.com';

const { createApp } = require('../server');

let server;
let baseUrl;
let adminToken = '';
let studentToken = '';
let studentId = null;

async function api(path, { method = 'GET', token = null, body = null, expectedStatus = 200 } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body != null) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch (e) {}

  assert.equal(
    res.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${res.status}. Body: ${text}`
  );
  return { status: res.status, data: parsed, text };
}

test.before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('register admin and student users', async () => {
  const admin = await api('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Integration Admin',
      email: 'integration.admin@example.com',
      password: 'Password123!'
    }
  });
  adminToken = admin.data?.token || '';
  assert.ok(adminToken, 'missing admin token');
  assert.equal(admin.data?.user?.role, 'admin');

  const student = await api('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Integration Student',
      email: `integration.student.${Date.now()}@example.com`,
      password: 'Password123!'
    }
  });
  studentToken = student.data?.token || '';
  studentId = Number(student.data?.user?.id) || null;
  assert.ok(studentToken, 'missing student token');
  assert.ok(studentId, 'missing student id');
  assert.equal(student.data?.user?.role, 'student');
});

test('record quiz attempt and mark lesson complete with certificate', async () => {
  const attempt = await api('/api/progress/quiz-attempt', {
    method: 'POST',
    token: studentToken,
    body: {
      lessonId: 1,
      quizId: 101,
      score: 9,
      total: 10,
      answers: [1, 2, 3, 4],
      review: [{ questionId: 1, explanation: 'Test explanation' }]
    }
  });
  assert.equal(attempt.data?.recorded, true);
  assert.equal(attempt.data?.completedLessonId, 1);
  assert.ok(attempt.data?.certId, 'certificate id should be issued');

  const me = await api('/api/progress/me', { token: studentToken });
  assert.ok(Array.isArray(me.data?.completedLessonIds));
  assert.ok(me.data.completedLessonIds.includes(1), 'lesson 1 should be completed');
  assert.ok(Array.isArray(me.data?.certificates));
  assert.ok(me.data.certificates.some((c) => Number(c.lessonId) === 1));
});

test('quiz attempts history contains review payload', async () => {
  const attempts = await api('/api/progress/quiz-attempts/1', { token: studentToken });
  assert.ok(Array.isArray(attempts.data));
  assert.ok(attempts.data.length >= 1);
  const latest = attempts.data[0];
  assert.equal(Number(latest.lesson_id), 1);
  assert.ok(Array.isArray(latest.review), 'review should be an array');
});

test('admin CSV export and CSV imports work', async () => {
  const usersCsv = await api('/api/admin/export/users.csv', {
    token: adminToken,
    expectedStatus: 200
  });
  assert.match(usersCsv.text, /^id,name,email,role,cohort,is_active,created_at/m);
  assert.match(usersCsv.text, /integration\.admin@example\.com/);

  const lessonsImport = await api('/api/admin/import/lessons-csv', {
    method: 'POST',
    token: adminToken,
    body: {
      csvText: [
        'title,slug,description,lesson_order,is_published,workflow_status',
        'Integration Test Lesson,integration-test-lesson,Lesson for integration tests,999,1,published'
      ].join('\n')
    }
  });
  assert.equal(lessonsImport.data?.ok, true);
  assert.ok((lessonsImport.data?.created || 0) + (lessonsImport.data?.updated || 0) >= 1);

  const subjectsImport = await api('/api/admin/import/subjects-csv', {
    method: 'POST',
    token: adminToken,
    body: {
      csvText: [
        'lesson_slug,subject_key,name,description,content_text,subject_order',
        'integration-test-lesson,intro,Intro Subject,Intro Description,Intro Content,1'
      ].join('\n')
    }
  });
  assert.equal(subjectsImport.data?.ok, true);
  assert.ok((subjectsImport.data?.created || 0) + (subjectsImport.data?.updated || 0) >= 1);
});
