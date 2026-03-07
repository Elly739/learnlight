import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { addMyDownload, getLesson, getLessonSubjects } from "../api";
import LESSON_SUBJECTS from "../data/lessonSubjects";

function buildSubjectBody(subject, lessonTitle) {
  const base = subject?.description || "This topic builds practical skills for this lesson.";
  const rawContent = String(subject?.content || "").trim();
  const lines = rawContent
    ? rawContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : [];
  const keyConcepts = lines.length
    ? lines.slice(0, 4)
    : [
        `Core idea behind ${subject?.name || "this subject"}`,
        "Typical workflow or implementation steps",
        "Common mistakes and how to avoid them",
        "How this links to the lesson quiz"
      ];
  const isCoding =
    /(javascript|react|node|api|sql|database|algorithm|css|html|docker|cloud|test)/i.test(
      subject?.name || ""
    );
  const example = isCoding
    ? `// ${subject?.name || "Subject"} quick example
const step = "apply the concept";
console.log("Practice:", step);`
    : `Example scenario:
A learner applies "${subject?.name || "this topic"}" in a mini project and documents results in their notes.`;
  return {
    overview: `This subject is part of "${lessonTitle || "this lesson"}". ${base}`,
    keyConcepts,
    outcomes: [
      `Explain the core ideas in "${subject?.name || "this topic"}".`,
      `Apply "${subject?.name || "this subject"}" in a practical study task.`,
      `Connect this subject to your quiz preparation and notes.`
    ],
    example,
    practice:
      "Practice task: write three key takeaways in your notes, then attempt the related quiz questions.",
    resources: ["Lesson notes section", "Quiz for this lesson", "Downloadable subject material"]
  };
}

export default function LessonSubject() {
  const { lessonId, subjectId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [subjectsData, setSubjectsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getLesson(lessonId), getLessonSubjects(lessonId)])
      .then(([lessonRes, subjectsRes]) => {
        setLesson(lessonRes || null);
        setSubjectsData(subjectsRes || []);
      })
      .catch(() => {
        setLesson(null);
        setSubjectsData([]);
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  const subjects =
    subjectsData.length > 0
      ? subjectsData
      : lesson
        ? LESSON_SUBJECTS[lesson.slug] || []
        : [];
  const subject = useMemo(
    () => subjects.find((s) => String(s.id) === String(subjectId)) || null,
    [subjects, subjectId]
  );

  async function handleDownload() {
    if (!lesson || !subject) return;
    try {
      await addMyDownload({
        lessonId: Number(lessonId),
        filename: `${lesson.title} - ${subject.name}.pdf`,
        url: `/lessons/${lessonId}/subjects/${subjectId}`,
        description: subject.description,
        subjectName: subject.name,
        downloadType: "subject",
        status: "downloaded"
      });
      setDownloaded(true);
    } catch (e) {
      alert("Please login to save downloads.");
    }
  }

  if (loading) return <h2 style={{ padding: "40px" }}>Loading subject...</h2>;
  if (!lesson || !subject) return <h2 style={{ padding: "40px" }}>Subject not found</h2>;

  const body = buildSubjectBody(subject, lesson.title);

  return (
    <div style={styles.wrapper} className="page-enter">
      <div style={styles.header}>
        <p style={styles.kicker}>{lesson.title}</p>
        <h1 style={styles.title}>{subject.name}</h1>
        <p style={styles.desc}>{subject.description}</p>
      </div>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Overview</h2>
        <p style={styles.para}>{body.overview}</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Key Concepts</h2>
        <ul style={styles.list}>
          {body.keyConcepts.map((item, idx) => (
            <li key={`concept-${idx}`}>{item}</li>
          ))}
        </ul>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Learning Outcomes</h2>
        <ul style={styles.list}>
          {body.outcomes.map((item, idx) => (
            <li key={`outcome-${idx}`}>{item}</li>
          ))}
        </ul>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Worked Example</h2>
        <pre style={styles.codeBlock}>
          <code>{body.example}</code>
        </pre>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Practice</h2>
        <p style={styles.para}>{body.practice}</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Resources</h2>
        <ul style={styles.list}>
          {body.resources.map((item, idx) => (
            <li key={`resource-${idx}`}>{item}</li>
          ))}
        </ul>
      </section>

      <div style={styles.actions}>
        <button onClick={handleDownload} style={styles.button}>
          {downloaded ? "Downloaded" : "Download Subject"}
        </button>
        <Link to={`/lessons/${lessonId}`} style={styles.linkButton}>
          Back to Lesson
        </Link>
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
    gap: "12px"
  },
  header: {
    marginBottom: "4px"
  },
  kicker: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#64748b"
  },
  title: {
    fontSize: "clamp(1.8rem, 4vw, 2.5rem)"
  },
  desc: {
    marginTop: "8px",
    lineHeight: 1.6
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "16px",
    boxShadow: "var(--shadow-sm)"
  },
  sectionTitle: {
    fontSize: "1.1rem"
  },
  para: {
    marginTop: "8px",
    lineHeight: 1.65
  },
  list: {
    marginTop: "8px",
    paddingLeft: "20px",
    lineHeight: 1.65
  },
  codeBlock: {
    marginTop: "8px",
    background: "#0f172a",
    color: "#e2e8f0",
    borderRadius: "8px",
    padding: "10px",
    overflowX: "auto",
    fontSize: "0.85rem"
  },
  actions: {
    marginTop: "8px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  button: {
    border: "none",
    borderRadius: "10px",
    background: "var(--brand)",
    color: "#fff",
    padding: "10px 14px",
    fontWeight: "700",
    cursor: "pointer"
  },
  linkButton: {
    display: "inline-block",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--text)",
    textDecoration: "none",
    padding: "10px 14px",
    fontWeight: "700",
    background: "#fff"
  }
};

