const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, opts = {}) {
  const url = `${API_URL}${path}`;
  const storedUser = localStorage.getItem('user');
  let token = null;
  try {
    token = storedUser ? JSON.parse(storedUser)?.token : null;
  } catch (e) {}

  const headers = {
    ...(opts.headers || {}),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text();
    let err = body;
    try { err = JSON.parse(body); } catch (e) {}
    const error = new Error(err.error || res.statusText || 'API error');
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export const getLessons = () => request('/api/lessons');
export const getLesson = (id) => request(`/api/lessons/${id}`);
export const getLessonBySlug = (slug) => request(`/api/lessons/slug/${slug}`);
export const getLessonSubjects = (id) => request(`/api/lessons/${id}/subjects`);

export const getDownloads = () => request('/api/downloads');
export const getDownloadsForLesson = (lessonId) => request(`/api/downloads/lesson/${lessonId}`);

export const getQuizForLesson = (lessonId) => request(`/api/quiz/lesson/${lessonId}`);
export const submitQuiz = (payload) => request('/api/quiz/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const getMyProgress = () => request('/api/progress/me');
export const recordQuizAttempt = (payload) => request('/api/progress/quiz-attempt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const getQuizAttempts = (lessonId) => request(`/api/progress/quiz-attempts/${lessonId}`);
export const getWeeklyLeaderboard = ({ scope = "global", cohort = "", windowDays = 7 } = {}) => {
  const qs = new URLSearchParams();
  if (scope) qs.set("scope", scope);
  if (cohort) qs.set("cohort", cohort);
  if (windowDays) qs.set("windowDays", String(windowDays));
  return request(`/api/progress/leaderboard?${qs.toString()}`);
};

export const verifyCertificate = (certId) => request(`/api/certificates/verify/${encodeURIComponent(certId)}`);

export const getMyLearnerDownloads = () => request('/api/learner/downloads');
export const getMyProfile = () => request('/api/learner/profile');
export const updateMyProfile = (payload) => request('/api/learner/profile', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const addMyDownload = (payload) => request('/api/learner/downloads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const updateMyDownload = (downloadId, payload) => request(`/api/learner/downloads/${downloadId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const getMyEnrollments = () => request('/api/learner/enrollments');
export const setMyEnrollment = (lessonId, enrolled = true) => request('/api/learner/enrollments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lessonId, enrolled }),
});

export const getMyBookmarks = () => request('/api/learner/bookmarks');
export const setMyBookmark = (lessonId, bookmarked) => request('/api/learner/bookmarks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lessonId, bookmarked }),
});

export const getMyLessonNote = (lessonId) => request(`/api/learner/notes/${lessonId}`);
export const saveMyLessonNote = (lessonId, noteText) => request(`/api/learner/notes/${lessonId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ noteText }),
});
export const getReminderPreferences = () => request('/api/reminders/preferences');
export const saveReminderPreferences = (payload) => request('/api/reminders/preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const getDueReminders = () => request('/api/reminders/due');

export const adminGetLessons = () => request('/api/admin/lessons');
export const adminCreateLesson = (payload) => request('/api/admin/lessons', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const adminUpdateLesson = (lessonId, payload) => request(`/api/admin/lessons/${lessonId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const adminDeleteLesson = (lessonId) => request(`/api/admin/lessons/${lessonId}`, {
  method: 'DELETE',
});
export const adminSubmitLessonForReview = (lessonId) => request(`/api/admin/lessons/${lessonId}/workflow/submit-review`, {
  method: 'POST',
});
export const adminApproveLesson = (lessonId) => request(`/api/admin/lessons/${lessonId}/workflow/approve`, {
  method: 'POST',
});
export const adminRejectLesson = (lessonId) => request(`/api/admin/lessons/${lessonId}/workflow/reject`, {
  method: 'POST',
});
export const adminGetSubjects = (lessonId) => request(`/api/admin/lessons/${lessonId}/subjects`);
export const adminCreateSubject = (lessonId, payload) => request(`/api/admin/lessons/${lessonId}/subjects`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const adminUpdateSubject = (subjectId, payload) => request(`/api/admin/subjects/${subjectId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const adminDeleteSubject = (subjectId) => request(`/api/admin/subjects/${subjectId}`, {
  method: 'DELETE',
});
export const adminGetQuiz = (lessonId) => request(`/api/admin/lessons/${lessonId}/quiz`);
export const adminSaveQuiz = (lessonId, payload) => request(`/api/admin/lessons/${lessonId}/quiz`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const adminSearchCertificates = ({ q = "", limit = 20 } = {}) => {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  qs.set("limit", String(limit));
  return request(`/api/admin/certificates/search?${qs.toString()}`);
};
export const adminGetUsers = (q = "") => {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  return request(`/api/admin/users${qs.toString() ? `?${qs.toString()}` : ""}`);
};
export const adminUpdateUser = (userId, payload) => request(`/api/admin/users/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const adminGetUserProgress = (userId) => request(`/api/admin/users/${userId}/progress`);
export const adminSetEnrollment = (payload) => request('/api/admin/enrollments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const adminGetQuizAnalytics = () => request('/api/admin/analytics/quiz');
export const adminRevokeCertificate = (certId) => request(`/api/admin/certificates/revoke/${encodeURIComponent(certId)}`, {
  method: 'POST',
});
export const adminRegenerateCertificate = (certId) => request(`/api/admin/certificates/regenerate/${encodeURIComponent(certId)}`, {
  method: 'POST',
});
export const adminGetAuditLogs = (limit = 100) => request(`/api/admin/audit-logs?limit=${Number(limit) || 100}`);
export const adminGetSettings = () => request('/api/admin/settings');
export const adminSaveSettings = (settings) => request('/api/admin/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ settings }),
});
export const adminExportUsersCsvUrl = () => `${API_URL}/api/admin/export/users.csv`;
export const adminExportLessonsCsvUrl = () => `${API_URL}/api/admin/export/lessons.csv`;
export const adminImportLessonsCsv = (csvText) => request('/api/admin/import/lessons-csv', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ csvText }),
});
export const adminImportSubjectsCsv = (csvText) => request('/api/admin/import/subjects-csv', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ csvText }),
});

export const authLogin = (email, password) => request('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

export const authRegister = (name, email, password, cohort = null) => request('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password, cohort }),
});

export default { API_URL };
