import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getLessons, getDownloadsForLesson } from "../api";
import api from "../api";
import subjects from "../data/subjects";

export default function SubjectDetail() {
  const { id } = useParams();
  const subject = subjects.find((s) => s.id === Number(id));

  const [completedLessons, setCompletedLessons] = useState(() => {
    if (!subject) return [];
    const completed = subject.lessons.filter((lessonId) =>
      localStorage.getItem(`completed-${subject.id}-${lessonId}`)
    );
    return completed.map((id) => Number(id));
  });
  const [allLessons, setAllLessons] = useState([]);
  const [downloadsByLesson, setDownloadsByLesson] = useState({});

  // fetch lessons from backend and cache locally so we can show accurate
  // titles and slugs for lesson IDs referenced by subjects
  useEffect(() => {
    getLessons()
      .then((data) => setAllLessons(data || []))
      .catch(() => setAllLessons([]));
  }, []);

  if (!subject) {
    return <h2 style={{ padding: "40px" }}>Subject not found</h2>;
  }

  function markCompleted(lessonId) {
    localStorage.setItem(
      `completed-${subject.id}-${lessonId}`,
      "true"
    );

    setCompletedLessons((prev) => [...new Set([...prev, Number(lessonId)])]);
  }

  function isUnlocked(lessonId) {
    // unlocking is relative to the subject's lesson order
    const idx = subject.lessons.indexOf(lessonId);
    if (idx <= 0) return true;
    const prevId = subject.lessons[idx - 1];
    return completedLessons.includes(Number(prevId));
  }

  return (
    <div style={{ padding: "40px", maxWidth: "700px" }}>
      <h1>{subject.name}</h1>
      <p style={{ opacity: 0.7 }}>{subject.level}</p>

      <div style={{ marginTop: "30px" }}>
          {subject.lessons.map((lessonId) => {
          // try to resolve lesson details from backend; fallback to id label
          const lesson = allLessons.find((l) => Number(l.id) === Number(lessonId));
          const title = lesson ? lesson.title : `Lesson ${lessonId}`;

          const unlocked = isUnlocked(lessonId);
          const completed = completedLessons.includes(lessonId);

          return (
            <div
              key={lessonId}
              style={unlocked ? styles.lessonCard : styles.lockedCard}
            >
              <h3 style={{ margin: 0 }}>
                {title} {completed && "✔"} {!unlocked && "🔒"}
              </h3>

              {unlocked && (
                <div style={{ marginTop: 8 }}>
                  {!completed && (
                    <button
                      onClick={() => markCompleted(lessonId)}
                      style={styles.button}
                    >
                      Mark as Completed
                    </button>
                  )}

                  <div style={{ marginTop: 8 }}>
                    {downloadsByLesson[lessonId] ? (
                      <div>
                        {downloadsByLesson[lessonId].length === 0 && (
                          <p style={{ margin: 0, fontSize: 14 }}>No downloads</p>
                        )}
                        {downloadsByLesson[lessonId].map((d) => {
                          const href = d.url && (d.url.startsWith('http') ? d.url : `${api.API_URL}${d.url}`);
                          return (
                            <div key={d.id} style={{ marginTop: 6 }}>
                              <a href={href} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }} download={d.filename}>
                                {d.filename}
                              </a>
                              {d.description && <div style={{ fontSize: 12, opacity: 0.8 }}>{d.description}</div>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            setDownloadsByLesson((s) => ({ ...s, [lessonId]: [] }));
                            const dl = await getDownloadsForLesson(lessonId);
                            setDownloadsByLesson((s) => ({ ...s, [lessonId]: dl || [] }));
                          } catch (err) {
                            setDownloadsByLesson((s) => ({ ...s, [lessonId]: [] }));
                          }
                        }}
                        style={{ ...styles.button, background: '#10b981' }}
                      >
                        Show Downloads
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!unlocked && (
                <p style={{ fontSize: "14px", marginTop: "8px" }}>
                  Complete previous lesson to unlock
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  lessonCard: {
    marginTop: "16px",
    padding: "20px",
    borderRadius: "14px",
    background: "#111827",
    border: "1px solid #374151",
    color: "#f9fafb",
    transition: "0.2s ease",
    cursor: "pointer"
  },
  lockedCard: {
    marginTop: "16px",
    padding: "20px",
    borderRadius: "14px",
    background: "#1f2937",
    border: "1px solid #374151",
    color: "#6b7280"
  },
  button: {
    marginTop: "12px",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "600"
  }
};
