import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getLessons, getMyEnrollments, getMyProgress } from "../api";
import LESSON_SUBJECTS from "../data/lessonSubjects";

const DIFFICULTY_BY_SLUG = {
  "foundations-of-digital-learning": "Beginner",
  "web-development-frontend": "Intermediate",
  "web-development-backend-apis": "Advanced",
  "mobile-app-development": "Intermediate",
  "data-science-ml-intro": "Intermediate",
  "algorithms-data-structures": "Advanced",
  "software-engineering-architecture": "Advanced",
  "devops-cloud-fundamentals": "Advanced",
  "ui-ux-product-design": "Beginner",
  "cybersecurity-privacy-essentials": "Intermediate",
  "career-soft-skills-tech-students": "Beginner",
  "entrepreneurship-product-strategy": "Intermediate"
};

function deriveTrack(title = "") {
  if (title.includes("—")) return title.split("—")[0].trim();
  return "General";
}

export default function Lessons() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedSet, setCompletedSet] = useState(new Set());
  const [enrolledSet, setEnrolledSet] = useState(new Set());
  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [completionFilter, setCompletionFilter] = useState("All");

  useEffect(() => {
    setLoading(true);
    getLessons()
      .then((lessonData) => setLessons(lessonData || []))
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));

    // Progress/enrollment are optional (unauthenticated users should still see lessons).
    getMyProgress()
      .then((progress) => {
        const ids = (progress?.completedLessonIds || []).map((id) => Number(id));
        setCompletedSet(new Set(ids));
      })
      .catch(() => setCompletedSet(new Set()));

    getMyEnrollments()
      .then((enrollments) => {
        const enrolledIds = (enrollments || []).map((e) => Number(e.lesson_id));
        setEnrolledSet(new Set(enrolledIds));
      })
      .catch(() => setEnrolledSet(new Set()));
  }, []);

  const tracks = Array.from(
    new Set((lessons || []).map((l) => deriveTrack(l.title)))
  ).sort((a, b) => a.localeCompare(b));

  const filteredLessons = (lessons || []).filter((lesson) => {
    const text = `${lesson.title || ""} ${lesson.description || ""}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const track = deriveTrack(lesson.title);
    const difficulty = DIFFICULTY_BY_SLUG[lesson.slug] || "Intermediate";
    const completed = completedSet.has(Number(lesson.id));
    const enrolled = enrolledSet.has(Number(lesson.id));
    const status = completed ? "Completed" : enrolled ? "In Progress" : "Not Enrolled";

    const matchesTrack = trackFilter === "All" || track === trackFilter;
    const matchesDifficulty = difficultyFilter === "All" || difficulty === difficultyFilter;
    const matchesCompletion =
      completionFilter === "All" ||
      completionFilter === status;

    return matchesQuery && matchesTrack && matchesDifficulty && matchesCompletion;
  });

  return (
    <div style={styles.wrapper} className="page-enter">
      <div style={styles.headRow}>
        <h1 style={styles.title}>Learning Tracks</h1>
        <p style={styles.subtitle}>Choose a lesson and go subject by subject, or download full lesson packs.</p>
      </div>

      <div style={styles.filters}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lessons by keyword..."
          style={styles.input}
        />
        <select value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)} style={styles.input}>
          <option>All</option>
          {tracks.map((track) => (
            <option key={track} value={track}>{track}</option>
          ))}
        </select>
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          style={styles.input}
        >
          <option>All</option>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
        <select
          value={completionFilter}
          onChange={(e) => setCompletionFilter(e.target.value)}
          style={styles.input}
        >
          <option>All</option>
          <option>Completed</option>
          <option>In Progress</option>
          <option>Not Enrolled</option>
        </select>
      </div>

      <div style={styles.grid} className="stagger-grid">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((n) => (
              <div key={`sk-${n}`} className="skeleton-box" style={styles.skeletonCard} />
            ))
          : filteredLessons.map((lesson) => {
              const subjectCount = (LESSON_SUBJECTS[lesson.slug] || []).length;
              const estimatedMinutes =
                Number(lesson.estimatedMinutes) || Math.max(45, subjectCount * 20);
              const track = deriveTrack(lesson.title);
              const difficulty = DIFFICULTY_BY_SLUG[lesson.slug] || "Intermediate";
              const completed = completedSet.has(Number(lesson.id));
              const enrolled = enrolledSet.has(Number(lesson.id));
              const status = completed ? "Completed" : enrolled ? "In Progress" : "Not Enrolled";
              return (
                <Link
                  key={lesson.id}
                  to={`/lessons/${lesson.id}`}
                  style={styles.card}
                  className="interactive-card"
                >
                  <div style={styles.cardTop}>
                    <span style={styles.badge}>Track {lesson.id}</span>
                    <span style={styles.subjectMeta}>{subjectCount} subjects</span>
                  </div>
                  <p style={styles.estimateText}>Estimated time: {estimatedMinutes} min</p>
                  <div style={styles.metaRow}>
                    <span style={styles.trackPill}>{track}</span>
                    <span style={styles.diffPill}>{difficulty}</span>
                    <span
                      style={{
                        ...styles.statusPill,
                        background:
                          status === "Completed"
                            ? "#dcfce7"
                            : status === "In Progress"
                              ? "#e2e8f0"
                              : "#fef3c7"
                      }}
                    >
                      {status}
                    </span>
                  </div>
                  <h3 style={styles.cardTitle}>{lesson.title}</h3>
                  <p style={styles.cardText}>{lesson.description}</p>
                  <span style={styles.cta}>Open lesson</span>
                </Link>
              );
            })}
      </div>
      {!loading && filteredLessons.length === 0 && (
        <p style={styles.emptyText}>No lessons match these filters.</p>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "42px 24px 70px"
  },
  headRow: {
    marginBottom: "16px"
  },
  title: {
    fontSize: "clamp(1.9rem, 4.2vw, 2.6rem)"
  },
  subtitle: {
    marginTop: "10px",
    maxWidth: "700px",
    lineHeight: 1.6
  },
  filters: {
    marginTop: "10px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "8px"
  },
  input: {
    padding: "10px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "#fff"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
    marginTop: "14px"
  },
  card: {
    textDecoration: "none",
    color: "inherit",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px"
  },
  badge: {
    background: "#e8f6f5",
    color: "#0f766e",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "700"
  },
  subjectMeta: {
    fontSize: "12px",
    color: "#5d6c7a"
  },
  estimateText: {
    fontSize: "12px",
    color: "#334155",
    fontWeight: "700"
  },
  metaRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap"
  },
  trackPill: {
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: "999px",
    padding: "3px 8px",
    fontSize: "11px",
    fontWeight: "700"
  },
  diffPill: {
    background: "#fff7ed",
    color: "#b45309",
    borderRadius: "999px",
    padding: "3px 8px",
    fontSize: "11px",
    fontWeight: "700"
  },
  statusPill: {
    color: "#0f172a",
    borderRadius: "999px",
    padding: "3px 8px",
    fontSize: "11px",
    fontWeight: "700"
  },
  cardTitle: {
    fontSize: "1.12rem",
    lineHeight: 1.35
  },
  cardText: {
    lineHeight: 1.55,
    minHeight: "70px"
  },
  cta: {
    color: "var(--brand)",
    fontWeight: "700"
  },
  skeletonCard: {
    height: "188px",
    borderRadius: "16px"
  },
  emptyText: {
    marginTop: "16px",
    color: "#475569"
  }
};
