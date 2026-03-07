import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  addMyDownload,
  getLesson,
  getLessonSubjects,
  getMyBookmarks,
  getMyLearnerDownloads,
  getMyEnrollments,
  getMyLessonNote,
  getMyProgress,
  saveMyLessonNote,
  setMyBookmark,
  setMyEnrollment
} from "../api";
import LESSON_SUBJECTS from "../data/lessonSubjects";
import {
  buildLessonDetailState,
  getEmptyLessonDetailState
} from "../utils/lessonDetailState";

export default function LessonDetail() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  const [completed, setCompleted] = useState(false);
  const [downloadedLesson, setDownloadedLesson] = useState(false);
  const [downloadedSubjects, setDownloadedSubjects] = useState([]);
  const [subjectsData, setSubjectsData] = useState([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSavedMsg, setNoteSavedMsg] = useState("");
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLesson(id)
      .then((data) => setLesson(data))
      .catch(() => setLesson(null))
      .finally(() => setLoading(false));

    getLessonSubjects(id)
      .then((rows) => setSubjectsData(rows || []))
      .catch(() => setSubjectsData([]));

    Promise.all([
      getMyProgress(),
      getMyLearnerDownloads(),
      getMyBookmarks(),
      getMyLessonNote(id),
      getMyEnrollments()
    ])
      .then(([progress, learnerDownloads, bookmarks, note, enrollments]) => {
        const state = buildLessonDetailState(
          id,
          progress,
          learnerDownloads,
          bookmarks,
          note,
          enrollments
        );
        setCompleted(state.completed);
        setDownloadedLesson(state.downloadedLesson);
        setDownloadedSubjects(state.downloadedSubjects);
        setBookmarked(state.bookmarked);
        setNoteText(state.noteText);
        setEnrolled(state.enrolled);
      })
      .catch(() => {
        const emptyState = getEmptyLessonDetailState();
        setCompleted(emptyState.completed);
        setDownloadedLesson(emptyState.downloadedLesson);
        setDownloadedSubjects(emptyState.downloadedSubjects);
        setBookmarked(emptyState.bookmarked);
        setNoteText(emptyState.noteText);
        setEnrolled(emptyState.enrolled);
      });
  }, [id]);

  const subjects =
    subjectsData.length > 0
      ? subjectsData
      : lesson
        ? LESSON_SUBJECTS[lesson.slug] || []
        : [];
  const estimatedMinutes =
    Number(lesson?.estimatedMinutes) || Math.max(45, (subjects?.length || 0) * 20);
  const subjectCheckpointDone =
    (subjects?.length || 0) > 0 &&
    downloadedSubjects.length >= subjects.length;
  const checkpoints = [
    { key: "enroll", label: "Enroll in lesson", done: enrolled },
    {
      key: "subjects",
      label: `Prepare resources (${Math.min(downloadedSubjects.length, subjects.length)}/${subjects.length} subjects)`,
      done: subjectCheckpointDone
    },
    { key: "quiz", label: "Complete lesson quiz", done: completed }
  ];
  const checkpointDoneCount = checkpoints.filter((c) => c.done).length;
  const checkpointPercent = Math.round((checkpointDoneCount / checkpoints.length) * 100);

  async function downloadSubject(subject) {
    if (!lesson) return;
    try {
      await addMyDownload({
        lessonId: Number(id),
        filename: `${lesson.title} - ${subject.name}.pdf`,
        url: `/lessons/${id}`,
        description: subject.description,
        subjectName: subject.name,
        downloadType: "subject",
        status: "downloaded"
      });

      setDownloadedSubjects((prev) =>
        prev.includes(subject.name) ? prev : [...prev, subject.name]
      );
    } catch (e) {
      alert("Please login to save downloads.");
    }
  }

  async function handleDownloadLesson() {
    if (!lesson) return;
    try {
      await addMyDownload({
        lessonId: Number(id),
        filename: `${lesson.title} - Full Lesson.pdf`,
        url: `/lessons/${id}`,
        description: lesson.description || "Full lesson package",
        downloadType: "lesson",
        status: "downloaded"
      });

      for (const subject of subjects) {
        await addMyDownload({
          lessonId: Number(id),
          filename: `${lesson.title} - ${subject.name}.pdf`,
          url: `/lessons/${id}`,
          description: subject.description,
          subjectName: subject.name,
          downloadType: "subject",
          status: "downloaded"
        });
      }

      setDownloadedSubjects(subjects.map((s) => s.name));
      setDownloadedLesson(true);
    } catch (e) {
      alert("Please login to save downloads.");
    }
  }

  async function toggleBookmark() {
    const next = !bookmarked;
    try {
      await setMyBookmark(Number(id), next);
      setBookmarked(next);
    } catch (e) {
      alert("Please login to use bookmarks.");
    }
  }

  async function saveNote() {
    try {
      await saveMyLessonNote(Number(id), noteText);
      setNoteSavedMsg("Note saved");
      setTimeout(() => setNoteSavedMsg(""), 1300);
    } catch (e) {
      alert("Please login to save notes.");
    }
  }

  async function toggleEnrollment() {
    const next = !enrolled;
    try {
      await setMyEnrollment(Number(id), next);
      setEnrolled(next);
    } catch (e) {
      alert("Please login to manage enrollment.");
    }
  }

  if (loading) return <h2 style={{ padding: "40px" }}>Loading...</h2>;
  if (!lesson) return <h2 style={{ padding: "40px" }}>Lesson not found</h2>;

  return (
    <div style={styles.wrapper} className="page-enter">
      <section style={styles.headerCard}>
        <p style={styles.slug}>{lesson.slug}</p>
        <h1 style={styles.title}>{lesson.title}</h1>
        <p style={styles.desc}>{lesson.description}</p>
        <p style={styles.metaLine}>Estimated time: {estimatedMinutes} minutes</p>

        <div style={styles.checkpointCard}>
          <div style={styles.checkpointTop}>
            <h3 style={styles.checkpointTitle}>Completion checkpoints</h3>
            <span style={styles.checkpointPercent}>{checkpointPercent}%</span>
          </div>
          <div style={styles.checkpointBar}>
            <div style={{ ...styles.checkpointFill, width: `${checkpointPercent}%` }} />
          </div>
          <div style={styles.checkpointList}>
            {checkpoints.map((cp) => (
              <p key={cp.key} style={styles.checkpointItem}>
                <span style={styles.checkpointIcon}>{cp.done ? "✓" : "○"}</span>
                {cp.label}
              </p>
            ))}
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={toggleEnrollment}
            style={{
              ...styles.enrollButton,
              background: enrolled ? "#0f766e" : "#0b5cab"
            }}
          >
            {enrolled ? "Enrolled" : "Enroll in Lesson"}
          </button>
          <button
            onClick={handleDownloadLesson}
            style={{
              ...styles.primaryButton,
              background: downloadedLesson ? "#0f766e" : "var(--brand)"
            }}
          >
            {downloadedLesson ? "Entire Lesson Downloaded" : "Download Entire Lesson"}
          </button>
          <button onClick={toggleBookmark} style={styles.bookmarkButton}>
            {bookmarked ? "Bookmarked" : "Bookmark Lesson"}
          </button>
        </div>
      </section>

      {subjects.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Subjects</h2>
          <div style={styles.subjectGrid} className="stagger-grid">
            {subjects.map((subject) => {
              const isDownloaded = downloadedSubjects.includes(subject.name);
              return (
                <article key={subject.id} style={styles.subjectCard} className="interactive-card">
                  <Link
                    to={`/lessons/${id}/subjects/${encodeURIComponent(subject.id)}`}
                    style={styles.subjectOpenLink}
                  >
                    Open Subject
                  </Link>
                  <h3 style={styles.subjectTitle}>{subject.name}</h3>
                  <p style={styles.subjectDescription}>{subject.description}</p>
                  <button
                    onClick={() => downloadSubject(subject)}
                    style={{
                      ...styles.subjectButton,
                      background: isDownloaded ? "#0f766e" : "#334155"
                    }}
                  >
                    {isDownloaded ? "Downloaded" : "Download Subject"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>My Notes</h2>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Write notes for this lesson..."
          style={styles.notesArea}
        />
        <div style={styles.noteActions}>
          <button onClick={saveNote} style={styles.saveNoteButton}>Save Note</button>
          {noteSavedMsg && <span style={styles.noteSaved}>{noteSavedMsg}</span>}
        </div>
      </section>

      <section style={styles.footerActions}>
        <Link to={`/quiz/${id}`} style={{ textDecoration: "none" }}>
          <button style={styles.quizButton}>
            {completed ? "Retake Quiz" : "Take Quiz to Complete Lesson"}
          </button>
        </Link>
      </section>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "42px 24px 70px"
  },
  headerCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "18px",
    boxShadow: "var(--shadow-sm)",
    padding: "24px"
  },
  slug: {
    fontSize: "12px",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#6b7280"
  },
  title: {
    marginTop: "8px",
    fontSize: "clamp(1.8rem, 4vw, 2.6rem)"
  },
  desc: {
    marginTop: "12px",
    lineHeight: 1.65,
    maxWidth: "760px"
  },
  metaLine: {
    marginTop: "10px",
    fontWeight: "700",
    color: "#334155"
  },
  checkpointCard: {
    marginTop: "12px",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "var(--bg-soft)",
    padding: "12px"
  },
  checkpointTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px"
  },
  checkpointTitle: {
    fontSize: "1rem"
  },
  checkpointPercent: {
    fontWeight: "800",
    color: "var(--brand)"
  },
  checkpointBar: {
    marginTop: "8px",
    height: "8px",
    borderRadius: "999px",
    background: "#dbe4ea",
    overflow: "hidden"
  },
  checkpointFill: {
    height: "100%",
    background: "linear-gradient(90deg, #0f766e, #0b5cab)",
    transition: "width 0.5s ease"
  },
  checkpointList: {
    marginTop: "10px",
    display: "grid",
    gap: "4px"
  },
  checkpointItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    lineHeight: 1.45
  },
  checkpointIcon: {
    width: "18px",
    textAlign: "center",
    fontWeight: "800",
    color: "#0f766e"
  },
  headerActions: {
    marginTop: "18px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  primaryButton: {
    border: "none",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer"
  },
  enrollButton: {
    border: "none",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer"
  },
  bookmarkButton: {
    border: "1px solid var(--border)",
    background: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer"
  },
  section: {
    marginTop: "22px"
  },
  sectionTitle: {
    marginBottom: "10px"
  },
  subjectGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px"
  },
  subjectCard: {
    border: "1px solid var(--border)",
    borderRadius: "14px",
    background: "var(--card)",
    padding: "16px",
    boxShadow: "var(--shadow-sm)"
  },
  subjectOpenLink: {
    display: "inline-block",
    border: "1px solid var(--border)",
    background: "#fff",
    borderRadius: "8px",
    padding: "6px 10px",
    fontWeight: "700",
    cursor: "pointer",
    textDecoration: "none",
    color: "var(--text)"
  },
  subjectTitle: {
    marginTop: "10px",
    fontSize: "1rem"
  },
  subjectDescription: {
    marginTop: "8px",
    lineHeight: 1.55
  },
  subjectButton: {
    marginTop: "12px",
    border: "none",
    color: "#fff",
    padding: "9px 13px",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer"
  },
  notesArea: {
    width: "100%",
    minHeight: "130px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    padding: "12px",
    background: "#fff"
  },
  noteActions: {
    marginTop: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  saveNoteButton: {
    border: "none",
    background: "var(--brand)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer"
  },
  noteSaved: {
    color: "#0f766e",
    fontWeight: "700"
  },
  footerActions: {
    marginTop: "22px",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap"
  },
  quizButton: {
    border: "none",
    background: "#7c3aed",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer"
  }
};
