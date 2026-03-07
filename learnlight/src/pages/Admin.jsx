import { useEffect, useMemo, useState } from "react";
import {
  adminApproveLesson,
  adminCreateLesson,
  adminCreateSubject,
  adminDeleteLesson,
  adminDeleteSubject,
  adminExportLessonsCsvUrl,
  adminExportUsersCsvUrl,
  adminGetAuditLogs,
  adminGetLessons,
  adminGetQuizAnalytics,
  adminGetQuiz,
  adminGetSettings,
  adminGetSubjects,
  adminGetUserProgress,
  adminGetUsers,
  adminImportLessonsCsv,
  adminImportSubjectsCsv,
  adminRegenerateCertificate,
  adminRejectLesson,
  adminRevokeCertificate,
  adminSaveQuiz,
  adminSaveSettings,
  adminSearchCertificates,
  adminSetEnrollment,
  adminSubmitLessonForReview,
  adminUpdateLesson,
  adminUpdateUser,
  adminUpdateSubject
} from "../api";

export default function Admin() {
  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [quiz, setQuiz] = useState({ title: "Quiz", questions: [] });
  const [newLesson, setNewLesson] = useState({
    title: "",
    slug: "",
    description: "",
    lessonOrder: 0,
    estimatedMinutes: 90,
    isPublished: true,
    workflowStatus: "published"
  });
  const [editLesson, setEditLesson] = useState({
    title: "",
    slug: "",
    description: "",
    lessonOrder: 0,
    estimatedMinutes: 90,
    isPublished: true,
    workflowStatus: "draft"
  });
  const [newSubject, setNewSubject] = useState({
    subjectKey: "",
    name: "",
    description: "",
    content: "",
    subjectOrder: 0
  });
  const [certQuery, setCertQuery] = useState("");
  const [certResults, setCertResults] = useState([]);
  const [certLoading, setCertLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState({
    feature_flags: {
      reminders: true,
      leaderboard: true,
      certificates: true
    },
    maintenance_mode: false
  });
  const [enrollmentDraft, setEnrollmentDraft] = useState({ userId: "", lessonId: "", enrolled: true });
  const [lessonsCsvText, setLessonsCsvText] = useState("");
  const [subjectsCsvText, setSubjectsCsvText] = useState("");

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => Number(lesson.id) === Number(selectedLessonId)) || null,
    [lessons, selectedLessonId]
  );

  async function loadLessons() {
    const data = await adminGetLessons();
    setLessons(data || []);
    if (!selectedLessonId && data?.length) setSelectedLessonId(Number(data[0].id));
  }

  async function loadLessonMeta(lessonId) {
    if (!lessonId) return;
    const [subjectRows, quizRes] = await Promise.all([
      adminGetSubjects(lessonId),
      adminGetQuiz(lessonId)
    ]);
    setSubjects(subjectRows || []);
    setQuiz(
      quizRes?.quiz || {
        title: "Quiz",
        questions: []
      }
    );
  }

  useEffect(() => {
    loadLessons().catch(() => {});
  }, []);

  useEffect(() => {
    searchCertificates("").catch(() => {});
    loadUsers("").catch(() => {});
    loadAnalytics().catch(() => {});
    loadAuditLogs().catch(() => {});
    loadSettings().catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedLessonId) return;
    loadLessonMeta(selectedLessonId).catch(() => {});
  }, [selectedLessonId]);

  useEffect(() => {
    if (!selectedLesson) return;
    setEditLesson({
      title: selectedLesson.title || "",
      slug: selectedLesson.slug || "",
      description: selectedLesson.description || "",
      lessonOrder: Number(selectedLesson.lesson_order || 0),
      estimatedMinutes: Number(selectedLesson.estimated_minutes || 90),
      isPublished: Boolean(selectedLesson.is_published),
      workflowStatus: selectedLesson.workflow_status || "draft"
    });
  }, [selectedLesson]);

  async function createLesson(e) {
    e.preventDefault();
    await adminCreateLesson(newLesson);
    setNewLesson({
      title: "",
      slug: "",
      description: "",
      lessonOrder: 0,
      estimatedMinutes: 90,
      isPublished: true,
      workflowStatus: "published"
    });
    await loadLessons();
  }

  async function saveLesson(e) {
    e.preventDefault();
    if (!selectedLessonId) return;
    await adminUpdateLesson(selectedLessonId, editLesson);
    await loadLessons();
  }

  async function removeLesson(id) {
    if (!confirm("Delete this lesson and its quiz/subjects?")) return;
    await adminDeleteLesson(id);
    await loadLessons();
    if (Number(selectedLessonId) === Number(id)) setSelectedLessonId(null);
  }

  async function createSubject(e) {
    e.preventDefault();
    if (!selectedLessonId) return;
    await adminCreateSubject(selectedLessonId, newSubject);
    setNewSubject({ subjectKey: "", name: "", description: "", content: "", subjectOrder: 0 });
    await loadLessonMeta(selectedLessonId);
  }

  async function saveSubject(subjectId, payload) {
    await adminUpdateSubject(subjectId, payload);
    await loadLessonMeta(selectedLessonId);
  }

  async function removeSubject(subjectId) {
    await adminDeleteSubject(subjectId);
    await loadLessonMeta(selectedLessonId);
  }

  function addQuestion() {
    setQuiz((prev) => ({
      ...prev,
      questions: [
        ...(prev.questions || []),
        {
          question_text: "",
          explanation: "",
          options: [
            { option_text: "", is_correct: true },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false }
          ]
        }
      ]
    }));
  }

  function removeQuestion(index) {
    setQuiz((prev) => {
      const questions = [...(prev.questions || [])];
      questions.splice(index, 1);
      return { ...prev, questions };
    });
  }

  function moveQuestion(index, direction) {
    setQuiz((prev) => {
      const questions = [...(prev.questions || [])];
      const next = index + direction;
      if (next < 0 || next >= questions.length) return prev;
      [questions[index], questions[next]] = [questions[next], questions[index]];
      return { ...prev, questions };
    });
  }

  function updateQuestion(index, value) {
    setQuiz((prev) => {
      const questions = [...(prev.questions || [])];
      questions[index] = { ...questions[index], question_text: value };
      return { ...prev, questions };
    });
  }

  function updateExplanation(index, value) {
    setQuiz((prev) => {
      const questions = [...(prev.questions || [])];
      questions[index] = { ...questions[index], explanation: value };
      return { ...prev, questions };
    });
  }

  function updateOption(qIndex, oIndex, value) {
    setQuiz((prev) => {
      const questions = [...(prev.questions || [])];
      const options = [...(questions[qIndex].options || [])];
      options[oIndex] = { ...options[oIndex], option_text: value };
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, questions };
    });
  }

  function setCorrectOption(qIndex, oIndex) {
    setQuiz((prev) => {
      const questions = [...(prev.questions || [])];
      const options = (questions[qIndex].options || []).map((opt, idx) => ({
        ...opt,
        is_correct: idx === oIndex
      }));
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, questions };
    });
  }

  async function saveQuiz() {
    if (!selectedLessonId) return;
    await adminSaveQuiz(selectedLessonId, quiz);
    await loadLessonMeta(selectedLessonId);
    alert("Quiz saved");
  }

  async function searchCertificates(queryText = certQuery) {
    setCertLoading(true);
    try {
      const data = await adminSearchCertificates({ q: queryText, limit: 25 });
      setCertResults(Array.isArray(data?.results) ? data.results : []);
    } catch (e) {
      setCertResults([]);
    } finally {
      setCertLoading(false);
    }
  }

  async function loadUsers(q = "") {
    const rows = await adminGetUsers(q);
    setUsers(rows || []);
    if (!selectedUserId && rows?.length) setSelectedUserId(Number(rows[0].id));
  }

  async function loadUserProgress(userId) {
    if (!userId) return;
    const data = await adminGetUserProgress(userId);
    setUserProgress(data || null);
  }

  async function loadAnalytics() {
    const data = await adminGetQuizAnalytics();
    setAnalytics(data?.byLesson || []);
  }

  async function loadAuditLogs() {
    const rows = await adminGetAuditLogs(100);
    setAuditLogs(rows || []);
  }

  async function loadSettings() {
    const data = await adminGetSettings();
    const next = data?.settings || {};
    setSettings((prev) => ({
      feature_flags: {
        reminders: next.feature_flags?.reminders ?? prev.feature_flags.reminders,
        leaderboard: next.feature_flags?.leaderboard ?? prev.feature_flags.leaderboard,
        certificates: next.feature_flags?.certificates ?? prev.feature_flags.certificates
      },
      maintenance_mode: Boolean(next.maintenance_mode ?? prev.maintenance_mode)
    }));
  }

  useEffect(() => {
    if (!selectedUserId) return;
    loadUserProgress(selectedUserId).catch(() => {});
  }, [selectedUserId]);

  async function saveUser(userId, payload) {
    await adminUpdateUser(userId, payload);
    await loadUsers(userQuery);
    if (selectedUserId) await loadUserProgress(selectedUserId);
  }

  async function saveEnrollment(e) {
    e.preventDefault();
    await adminSetEnrollment({
      userId: Number(enrollmentDraft.userId),
      lessonId: Number(enrollmentDraft.lessonId),
      enrolled: Boolean(enrollmentDraft.enrolled)
    });
    alert("Enrollment updated");
    if (selectedUserId) await loadUserProgress(selectedUserId);
  }

  async function revokeCert(certId) {
    if (!confirm(`Revoke certificate ${certId}?`)) return;
    await adminRevokeCertificate(certId);
    await searchCertificates(certQuery);
    if (selectedUserId) await loadUserProgress(selectedUserId);
    await loadAuditLogs();
  }

  async function regenerateCert(certId) {
    const res = await adminRegenerateCertificate(certId);
    alert(`New cert id: ${res?.newCertId || "N/A"}`);
    await searchCertificates(certQuery);
    if (selectedUserId) await loadUserProgress(selectedUserId);
    await loadAuditLogs();
  }

  async function saveSiteSettings(e) {
    e.preventDefault();
    await adminSaveSettings(settings);
    await loadSettings();
    await loadAuditLogs();
    alert("Settings saved");
  }

  async function changeWorkflow(action) {
    if (!selectedLessonId) return;
    if (action === "submit-review") {
      await adminSubmitLessonForReview(selectedLessonId);
    } else if (action === "approve") {
      await adminApproveLesson(selectedLessonId);
    } else if (action === "reject") {
      await adminRejectLesson(selectedLessonId);
    }
    await loadLessons();
  }

  async function importLessonsCsv(e) {
    e.preventDefault();
    const res = await adminImportLessonsCsv(lessonsCsvText);
    alert(`Lessons import complete: ${res?.created || 0} created, ${res?.updated || 0} updated.`);
    await loadLessons();
    await loadAuditLogs();
  }

  async function importSubjectsCsv(e) {
    e.preventDefault();
    const res = await adminImportSubjectsCsv(subjectsCsvText);
    alert(`Subjects import complete: ${res?.created || 0} created, ${res?.updated || 0} updated.`);
    if (selectedLessonId) await loadLessonMeta(selectedLessonId);
    await loadAuditLogs();
  }

  function downloadCsvTemplate(filename, content) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }

  function downloadLessonsTemplate() {
    const template = [
      "title,slug,description,lesson_order,estimated_minutes,is_published,workflow_status",
      "\"Foundations of Digital Learning\",foundations-digital-learning,\"Onboarding and learning systems\",1,95,1,published",
      "\"Web Development - Frontend\",web-development-frontend,\"Frontend foundations and React basics\",2,120,1,published"
    ].join("\n");
    downloadCsvTemplate("lessons-template.csv", template);
  }

  function downloadSubjectsTemplate() {
    const template = [
      "lesson_slug,subject_key,name,description,content_text,subject_order",
      "foundations-digital-learning,learning-science-basics,\"Learning science basics\",\"How people retain info\",\"Use retrieval practice, spacing, and interleaving.\",1",
      "web-development-frontend,html-semantic-markup,\"HTML & semantic markup\",\"Write accessible semantic HTML\",\"Use section, article, nav, header, main, and footer correctly.\",1"
    ].join("\n");
    downloadCsvTemplate("subjects-template.csv", template);
  }

  async function downloadCsv(url) {
    try {
      const storedUser = localStorage.getItem("user");
      const token = storedUser ? JSON.parse(storedUser)?.token : null;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const errText = await res.text();
        let errMsg = `Export failed (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed?.error ? `${errMsg}: ${parsed.error}` : errMsg;
        } catch (e) {
          if (errText) errMsg = `${errMsg}: ${errText}`;
        }
        throw new Error(errMsg);
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = url.includes("users") ? "users.csv" : "lessons.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      alert(e?.message || "CSV export failed.");
    }
  }

  return (
    <div style={styles.wrapper} className="page-enter">
      <h1 style={styles.title}>Admin Content Manager</h1>
      <p style={styles.subtitle}>Manage lessons, subjects, and quizzes without editing code.</p>

      <section style={styles.card}>
        <h2>Create Lesson</h2>
        <form onSubmit={createLesson} style={styles.grid2}>
          <input value={newLesson.title} onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} placeholder="Title" style={styles.input} />
          <input value={newLesson.slug} onChange={(e) => setNewLesson({ ...newLesson, slug: e.target.value })} placeholder="Slug" style={styles.input} />
          <input value={newLesson.description} onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })} placeholder="Description" style={styles.input} />
          <input type="number" value={newLesson.lessonOrder} onChange={(e) => setNewLesson({ ...newLesson, lessonOrder: Number(e.target.value) })} placeholder="Order" style={styles.input} />
          <input type="number" value={newLesson.estimatedMinutes} onChange={(e) => setNewLesson({ ...newLesson, estimatedMinutes: Number(e.target.value) })} placeholder="Estimated Minutes" style={styles.input} />
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={Boolean(newLesson.isPublished)} onChange={(e) => setNewLesson({ ...newLesson, isPublished: e.target.checked })} /> Published
          </label>
          <select
            value={newLesson.workflowStatus}
            onChange={(e) => setNewLesson({ ...newLesson, workflowStatus: e.target.value })}
            style={styles.input}
          >
            <option value="draft">draft</option>
            <option value="in_review">in_review</option>
            <option value="published">published</option>
          </select>
          <button style={styles.button}>Create Lesson</button>
        </form>
      </section>

      <section style={styles.card}>
        <h2>Bulk CSV Import</h2>
        <div style={styles.actions}>
          <button type="button" style={styles.secondaryButton} onClick={downloadLessonsTemplate}>
            Download Lessons Template
          </button>
          <button type="button" style={styles.secondaryButton} onClick={downloadSubjectsTemplate}>
            Download Subjects Template
          </button>
        </div>
        <form onSubmit={importLessonsCsv} style={styles.list}>
          <label style={styles.metaText}><strong>Lessons CSV</strong> columns: title, slug, description, lesson_order, estimated_minutes, is_published, workflow_status</label>
          <textarea
            value={lessonsCsvText}
            onChange={(e) => setLessonsCsvText(e.target.value)}
            placeholder={"title,slug,description,lesson_order,estimated_minutes,is_published,workflow_status"}
            style={styles.textarea}
          />
          <button style={styles.button}>Import Lessons CSV</button>
        </form>
        <form onSubmit={importSubjectsCsv} style={styles.list}>
          <label style={styles.metaText}><strong>Subjects CSV</strong> columns: lesson_slug, subject_key, name, description, content_text, subject_order</label>
          <textarea
            value={subjectsCsvText}
            onChange={(e) => setSubjectsCsvText(e.target.value)}
            placeholder={"lesson_slug,subject_key,name,description,content_text,subject_order"}
            style={styles.textarea}
          />
          <button style={styles.button}>Import Subjects CSV</button>
        </form>
      </section>

      <section style={styles.card}>
        <h2>Certificate Lookup</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            searchCertificates().catch(() => {});
          }}
          style={styles.grid2}
        >
          <input
            value={certQuery}
            onChange={(e) => setCertQuery(e.target.value)}
            placeholder="Search by cert ID, learner email, or learner name"
            style={styles.input}
          />
          <button style={styles.button}>Search</button>
        </form>
        <div style={styles.list}>
          {certLoading ? (
            <p>Loading certificates...</p>
          ) : certResults.length === 0 ? (
            <p>No certificates found.</p>
          ) : (
            certResults.map((row) => {
              const issued = row.issuedAt
                ? new Date(row.issuedAt).toLocaleDateString()
                : "N/A";
              const verifyUrl = `/verify/${encodeURIComponent(row.certId)}`;
              return (
                <div key={row.certId} style={styles.subjectCard}>
                  <p style={styles.metaText}><strong>ID:</strong> {row.certId}</p>
                  <p style={styles.metaText}>
                    <strong>Learner:</strong> {row.learner?.name || row.learner?.email || "N/A"}
                  </p>
                  <p style={styles.metaText}><strong>Lesson:</strong> {row.lessonTitle}</p>
                  <p style={styles.metaText}><strong>Issued:</strong> {issued}</p>
                  <a href={verifyUrl} target="_blank" rel="noreferrer" style={styles.link}>
                    Open Verify Page
                  </a>
                  <div style={styles.actions}>
                    <button type="button" style={styles.danger} onClick={() => revokeCert(row.certId)}>Revoke</button>
                    <button type="button" style={styles.secondaryButton} onClick={() => regenerateCert(row.certId)}>Regenerate</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section style={styles.card}>
        <h2>User Management</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadUsers(userQuery).catch(() => {});
          }}
          style={styles.grid2}
        >
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Search by name or email"
            style={styles.input}
          />
          <button style={styles.button}>Search Users</button>
        </form>
        <div style={styles.list}>
          {users.map((u) => (
            <EditableUserRow
              key={u.id}
              user={u}
              selected={Number(selectedUserId) === Number(u.id)}
              onSelect={() => setSelectedUserId(Number(u.id))}
              onSave={saveUser}
            />
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <h2>Learner Progress (Selected User)</h2>
        {!selectedUserId ? (
          <p>No user selected.</p>
        ) : !userProgress ? (
          <p>Loading progress...</p>
        ) : (
          <div style={styles.list}>
            <p style={styles.metaText}>
              Completed lessons: {(userProgress.completedLessonIds || []).join(", ") || "None"}
            </p>
            <p style={styles.metaText}>
              Certificates: {(userProgress.certificates || []).map((c) => c.cert_id).join(", ") || "None"}
            </p>
            <p style={styles.metaText}>
              Streak: {userProgress.streak?.current_streak || 0} (longest {userProgress.streak?.longest_streak || 0})
            </p>
            <div style={styles.subjectCard}>
              <strong>Recent Attempts</strong>
              {(userProgress.attempts || []).slice(0, 10).map((a) => {
                const p = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                return (
                  <p key={a.id} style={styles.metaText}>
                    Lesson {a.lesson_id}: {a.score}/{a.total} ({p}%)
                  </p>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section style={styles.card}>
        <h2>Enrollment Manager</h2>
        <form onSubmit={saveEnrollment} style={styles.grid2}>
          <input
            type="number"
            placeholder="User ID"
            value={enrollmentDraft.userId}
            onChange={(e) => setEnrollmentDraft({ ...enrollmentDraft, userId: e.target.value })}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Lesson ID"
            value={enrollmentDraft.lessonId}
            onChange={(e) => setEnrollmentDraft({ ...enrollmentDraft, lessonId: e.target.value })}
            style={styles.input}
          />
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={Boolean(enrollmentDraft.enrolled)}
              onChange={(e) => setEnrollmentDraft({ ...enrollmentDraft, enrolled: e.target.checked })}
            />
            Enrolled
          </label>
          <button style={styles.button}>Save Enrollment</button>
        </form>
      </section>

      <section style={styles.card}>
        <h2>Quiz Analytics</h2>
        <div style={styles.list}>
          {(analytics || []).map((row) => (
            <p key={row.lessonId} style={styles.metaText}>
              {row.lessonTitle}: {row.attemptsCount} attempts, avg {row.avgPercent}%
            </p>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <h2>Site Settings & Feature Flags</h2>
        <form onSubmit={saveSiteSettings} style={styles.grid2}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={Boolean(settings.feature_flags?.reminders)}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  feature_flags: { ...prev.feature_flags, reminders: e.target.checked }
                }))
              }
            />
            Reminders
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={Boolean(settings.feature_flags?.leaderboard)}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  feature_flags: { ...prev.feature_flags, leaderboard: e.target.checked }
                }))
              }
            />
            Leaderboard
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={Boolean(settings.feature_flags?.certificates)}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  feature_flags: { ...prev.feature_flags, certificates: e.target.checked }
                }))
              }
            />
            Certificates
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={Boolean(settings.maintenance_mode)}
              onChange={(e) => setSettings((prev) => ({ ...prev, maintenance_mode: e.target.checked }))}
            />
            Maintenance Mode
          </label>
          <button style={styles.button}>Save Settings</button>
        </form>
      </section>

      <section style={styles.card}>
        <h2>Audit Logs</h2>
        <div style={styles.list}>
          {(auditLogs || []).slice(0, 100).map((log) => (
            <p key={log.id} style={styles.metaText}>
              #{log.id} {log.created_at}: {log.action} ({log.entity_type || "n/a"} {log.entity_id || ""})
            </p>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <h2>CSV Export</h2>
        <div style={styles.actions}>
          <button type="button" style={styles.button} onClick={() => downloadCsv(adminExportUsersCsvUrl())}>
            Export Users CSV
          </button>
          <button type="button" style={styles.button} onClick={() => downloadCsv(adminExportLessonsCsvUrl())}>
            Export Lessons CSV
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <h2>Lessons</h2>
        <div style={styles.list}>
          {lessons.map((lesson) => (
            <div key={lesson.id} style={styles.row}>
              <button
                style={{
                  ...styles.selectButton,
                  background: Number(selectedLessonId) === Number(lesson.id) ? "#dbeafe" : "#fff"
                }}
                onClick={() => setSelectedLessonId(Number(lesson.id))}
              >
                {lesson.title} ({lesson.workflow_status || "draft"})
              </button>
              <button style={styles.danger} onClick={() => removeLesson(lesson.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      {selectedLessonId && (
        <>
          <section style={styles.card}>
            <h2>Edit Lesson ({selectedLessonId})</h2>
            <form onSubmit={saveLesson} style={styles.grid2}>
              <input value={editLesson.title} onChange={(e) => setEditLesson({ ...editLesson, title: e.target.value })} placeholder="Title" style={styles.input} />
              <input value={editLesson.slug} onChange={(e) => setEditLesson({ ...editLesson, slug: e.target.value })} placeholder="Slug" style={styles.input} />
              <input value={editLesson.description} onChange={(e) => setEditLesson({ ...editLesson, description: e.target.value })} placeholder="Description" style={styles.input} />
              <input type="number" value={editLesson.lessonOrder} onChange={(e) => setEditLesson({ ...editLesson, lessonOrder: Number(e.target.value) })} placeholder="Order" style={styles.input} />
              <input type="number" value={editLesson.estimatedMinutes} onChange={(e) => setEditLesson({ ...editLesson, estimatedMinutes: Number(e.target.value) })} placeholder="Estimated Minutes" style={styles.input} />
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={Boolean(editLesson.isPublished)} onChange={(e) => setEditLesson({ ...editLesson, isPublished: e.target.checked })} /> Published
              </label>
              <select
                value={editLesson.workflowStatus || "draft"}
                onChange={(e) => setEditLesson({ ...editLesson, workflowStatus: e.target.value })}
                style={styles.input}
              >
                <option value="draft">draft</option>
                <option value="in_review">in_review</option>
                <option value="published">published</option>
              </select>
              <button style={styles.button}>Save Lesson</button>
            </form>
            <div style={styles.actions}>
              <p style={styles.metaText}>Current workflow: <strong>{selectedLesson?.workflow_status || "draft"}</strong></p>
              <button type="button" style={styles.secondaryButton} onClick={() => changeWorkflow("submit-review")}>Submit Review</button>
              <button type="button" style={styles.button} onClick={() => changeWorkflow("approve")}>Approve</button>
              <button type="button" style={styles.danger} onClick={() => changeWorkflow("reject")}>Reject to Draft</button>
            </div>
          </section>

          <section style={styles.card}>
            <h2>Subjects (Lesson {selectedLessonId})</h2>
            <form onSubmit={createSubject} style={styles.grid2}>
              <input value={newSubject.subjectKey} onChange={(e) => setNewSubject({ ...newSubject, subjectKey: e.target.value })} placeholder="Subject Key" style={styles.input} />
              <input value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} placeholder="Name" style={styles.input} />
              <input value={newSubject.description} onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })} placeholder="Description" style={styles.input} />
              <textarea value={newSubject.content} onChange={(e) => setNewSubject({ ...newSubject, content: e.target.value })} placeholder="Detailed content (supports plain text and sections)" style={styles.textarea} />
              <input type="number" value={newSubject.subjectOrder} onChange={(e) => setNewSubject({ ...newSubject, subjectOrder: Number(e.target.value) })} placeholder="Order" style={styles.input} />
              <button style={styles.button}>Add Subject</button>
            </form>
            <div style={styles.list}>
              {subjects.map((subject) => (
                <EditableSubjectRow
                  key={subject.id}
                  subject={subject}
                  onSave={saveSubject}
                  onDelete={removeSubject}
                />
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2>Quiz Builder</h2>
            <input
              value={quiz.title || ""}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              placeholder="Quiz Title"
              style={styles.input}
            />
            <div style={styles.list}>
              {(quiz.questions || []).map((q, qIndex) => (
                <div key={qIndex} style={styles.questionCard}>
                  <div style={styles.rowControls}>
                    <strong>Question {qIndex + 1}</strong>
                    <div style={styles.actions}>
                      <button type="button" onClick={() => moveQuestion(qIndex, -1)} style={styles.secondaryButton}>Up</button>
                      <button type="button" onClick={() => moveQuestion(qIndex, 1)} style={styles.secondaryButton}>Down</button>
                      <button type="button" onClick={() => removeQuestion(qIndex)} style={styles.danger}>Remove</button>
                    </div>
                  </div>
                  <input
                    value={q.question_text || ""}
                    onChange={(e) => updateQuestion(qIndex, e.target.value)}
                    placeholder={`Question ${qIndex + 1}`}
                    style={styles.input}
                  />
                  <textarea
                    value={q.explanation || ""}
                    onChange={(e) => updateExplanation(qIndex, e.target.value)}
                    placeholder="Explanation shown after quiz submission"
                    style={styles.textarea}
                  />
                  {(q.options || []).map((opt, oIndex) => (
                    <div key={oIndex} style={styles.optionRow}>
                      <input
                        value={opt.option_text || ""}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        style={styles.input}
                      />
                      <label>
                        <input
                          type="radio"
                          checked={Boolean(opt.is_correct)}
                          onChange={() => setCorrectOption(qIndex, oIndex)}
                        />
                        Correct
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={styles.actions}>
              <button onClick={addQuestion} style={styles.button}>Add Question</button>
              <button onClick={saveQuiz} style={styles.button}>Save Quiz</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EditableSubjectRow({ subject, onSave, onDelete }) {
  const [draft, setDraft] = useState({
    subjectKey: subject.subject_key || "",
    name: subject.name || "",
    description: subject.description || "",
    content: subject.content_text || "",
    subjectOrder: Number(subject.subject_order || 0)
  });

  useEffect(() => {
    setDraft({
      subjectKey: subject.subject_key || "",
      name: subject.name || "",
      description: subject.description || "",
      content: subject.content_text || "",
      subjectOrder: Number(subject.subject_order || 0)
    });
  }, [subject]);

  return (
    <div style={styles.subjectCard}>
      <div style={styles.grid2}>
        <input value={draft.subjectKey} onChange={(e) => setDraft({ ...draft, subjectKey: e.target.value })} placeholder="Subject Key" style={styles.input} />
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" style={styles.input} />
        <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" style={styles.input} />
        <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="Detailed content" style={styles.textarea} />
        <input type="number" value={draft.subjectOrder} onChange={(e) => setDraft({ ...draft, subjectOrder: Number(e.target.value) })} placeholder="Order" style={styles.input} />
      </div>
      <div style={styles.actions}>
        <button type="button" style={styles.button} onClick={() => onSave(subject.id, draft)}>Save Subject</button>
        <button type="button" style={styles.danger} onClick={() => onDelete(subject.id)}>Delete</button>
      </div>
    </div>
  );
}

function EditableUserRow({ user, selected, onSelect, onSave }) {
  const [draft, setDraft] = useState({
    role: user.role || "student",
    cohort: user.cohort || "",
    isActive: Boolean(user.isActive)
  });

  useEffect(() => {
    setDraft({
      role: user.role || "student",
      cohort: user.cohort || "",
      isActive: Boolean(user.isActive)
    });
  }, [user]);

  return (
    <div style={{ ...styles.subjectCard, borderColor: selected ? "#0b5cab" : "var(--border)" }}>
      <button type="button" style={styles.selectUserButton} onClick={onSelect}>
        User #{user.id}: {user.name || user.email}
      </button>
      <p style={styles.metaText}>{user.email}</p>
      <div style={styles.grid2}>
        <select
          value={draft.role}
          onChange={(e) => setDraft({ ...draft, role: e.target.value })}
          style={styles.input}
        >
          <option value="student">student</option>
          <option value="admin">admin</option>
          <option value="editor">editor</option>
          <option value="support">support</option>
        </select>
        <input
          value={draft.cohort}
          onChange={(e) => setDraft({ ...draft, cohort: e.target.value })}
          placeholder="Cohort"
          style={styles.input}
        />
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={Boolean(draft.isActive)}
            onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
          />
          Active
        </label>
        <button type="button" style={styles.button} onClick={() => onSave(user.id, draft)}>
          Save User
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "42px 24px 70px",
    display: "grid",
    gap: "14px"
  },
  title: {
    fontSize: "clamp(1.9rem, 4.2vw, 2.6rem)"
  },
  subtitle: {
    marginTop: "-6px"
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    boxShadow: "var(--shadow-sm)",
    padding: "18px"
  },
  grid2: {
    marginTop: "10px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "8px"
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid var(--border)"
  },
  textarea: {
    minHeight: "78px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontFamily: "inherit",
    resize: "vertical"
  },
  checkboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px"
  },
  list: {
    marginTop: "10px",
    display: "grid",
    gap: "8px"
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "10px"
  },
  selectButton: {
    border: "none",
    background: "white",
    textAlign: "left",
    fontWeight: "700",
    cursor: "pointer"
  },
  danger: {
    border: "none",
    borderRadius: "8px",
    background: "#b91c1c",
    color: "white",
    padding: "8px 10px",
    fontWeight: "700",
    cursor: "pointer"
  },
  button: {
    border: "none",
    borderRadius: "8px",
    background: "var(--brand)",
    color: "white",
    padding: "10px 12px",
    fontWeight: "700",
    cursor: "pointer"
  },
  secondaryButton: {
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "white",
    color: "var(--text)",
    padding: "8px 10px",
    fontWeight: "700",
    cursor: "pointer"
  },
  questionCard: {
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "10px",
    display: "grid",
    gap: "8px"
  },
  optionRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px",
    alignItems: "center"
  },
  rowControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px"
  },
  actions: {
    marginTop: "10px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  subjectCard: {
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "10px"
  },
  selectUserButton: {
    border: "none",
    background: "transparent",
    textAlign: "left",
    fontWeight: "800",
    cursor: "pointer",
    padding: 0
  },
  metaText: {
    margin: "4px 0"
  },
  link: {
    display: "inline-block",
    marginTop: "6px",
    color: "var(--brand)",
    fontWeight: "700",
    textDecoration: "none"
  }
};
