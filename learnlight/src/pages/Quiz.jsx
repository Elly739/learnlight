import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getQuizForLesson, submitQuiz, recordQuizAttempt, getQuizAttempts } from "../api";

export default function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [issuedCertId, setIssuedCertId] = useState(null);
  const [attempts, setAttempts] = useState([]);

  async function loadAttempts() {
    try {
      const rows = await getQuizAttempts(id);
      setAttempts(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setAttempts([]);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([getQuizForLesson(id), loadAttempts()])
      .then(([data]) => {
        if (data && data.quiz) setQuiz(data.quiz);
      })
      .catch(() => setQuiz(null))
      .finally(() => setLoading(false));
  }, [id]);

  function goBack() {
    navigate(`/lessons/${id}`);
  }

  async function nextQuestion() {
    if (selected == null) return;

    const currentQ = quiz.questions[index];
    const newAnswers = answers.concat({ questionId: currentQ.id, optionId: Number(selected) });
    setAnswers(newAnswers);
    setSelected(null);

    if (index + 1 < quiz.questions.length) {
      setIndex(index + 1);
      return;
    }

    try {
      const payload = {
        quizId: quiz.id,
        answers: newAnswers,
        difficulty: quiz.difficulty || "medium"
      };
      const res = await submitQuiz(payload);
      setResult(res);
      const attempt = await recordQuizAttempt({
        lessonId: Number(id),
        quizId: Number(quiz.id),
        score: Number(res.score) || 0,
        total: Number(res.total) || 0,
        answers: newAnswers,
        review: Array.isArray(res.review) ? res.review : []
      });
      if (attempt?.certId) setIssuedCertId(attempt.certId);
      await loadAttempts();
    } catch (e) {
      setResult({ score: 0, total: newAnswers.length });
    }
  }

  if (loading) return <h2 style={{ padding: "40px" }}>Loading quiz...</h2>;
  if (!quiz) return <h2 style={{ padding: "40px" }}>Quiz not found</h2>;

  if (result) {
    const percent = Math.round((result.score / result.total) * 100);
    const passed = percent >= 60;

    return (
      <div style={styles.wrapper} className="page-enter">
        <div style={styles.card}>
          <h1 style={styles.title}>Quiz Complete</h1>
          <p style={styles.summary}>
            Score: <strong>{result.score}/{result.total}</strong> ({percent}%)
          </p>
          <p style={{ ...styles.status, color: passed ? "#0f766e" : "#b91c1c" }}>
            {passed ? "Passed" : "Needs another attempt"}
          </p>
          {Array.isArray(result.review) && result.review.length > 0 && (
            <div style={styles.reviewWrap}>
              <h3 style={styles.reviewTitle}>Answer Feedback</h3>
              {result.review.map((item, idx) => (
                <div key={`${item.questionId}-${idx}`} style={styles.reviewRow}>
                  <p style={styles.reviewQuestion}>
                    {idx + 1}. {item.questionText}
                  </p>
                  <p style={{ ...styles.reviewText, color: item.isCorrect ? "#0f766e" : "#b91c1c" }}>
                    {item.isCorrect ? "Correct" : "Incorrect"}
                  </p>
                  <p style={styles.reviewText}>Your answer: {item.selectedOptionText || "N/A"}</p>
                  <p style={styles.reviewText}>Correct answer: {item.correctOptionText || "N/A"}</p>
                  <p style={styles.reviewExplain}>{item.explanation}</p>
                </div>
              ))}
            </div>
          )}
          <div style={styles.reviewWrap}>
            <h3 style={styles.reviewTitle}>Attempt History</h3>
            {attempts.length === 0 ? (
              <p style={styles.reviewText}>No previous attempts yet.</p>
            ) : (
              attempts.slice(0, 5).map((attempt) => {
                const p = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
                return (
                  <p key={attempt.id} style={styles.reviewText}>
                    {new Date(attempt.created_at).toLocaleString()}: {attempt.score}/{attempt.total} ({p}%)
                  </p>
                );
              })
            )}
          </div>
          <div style={styles.resultActions}>
            <Link
              to={issuedCertId ? `/certificate/${issuedCertId}` : "/dashboard"}
              style={styles.buttonLink}
            >
              View Certificate
            </Link>
            <button onClick={goBack} style={styles.buttonSecondary}>
              Back to Lesson
            </button>
          </div>
        </div>
      </div>
    );
  }

  const current = quiz.questions[index];

  return (
    <div style={styles.wrapper} className="page-enter">
      <div style={styles.card}>
        <p style={styles.counter}>Question {index + 1} of {quiz.questions.length}</p>
        <p style={styles.difficulty}>Difficulty: {String(quiz.difficulty || "medium").toUpperCase()}</p>
        <h1 style={styles.title}>{quiz.title || `Question ${index + 1}`}</h1>
        <p style={styles.question}>{current.question_text}</p>

        <div style={styles.optionsWrap}>
          {current.options.map((opt) => (
            <label key={opt.id} style={styles.option}>
              <input
                type="radio"
                name={`q-${current.id}`}
                value={opt.id}
                checked={selected !== null && Number(selected) === opt.id}
                onChange={(e) => setSelected(e.target.value)}
              />
              <span>{opt.option_text}</span>
            </label>
          ))}
        </div>

        <button onClick={nextQuestion} style={styles.button}>
          {index + 1 === quiz.questions.length ? "Finish Quiz" : "Next"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "42px 24px 70px"
  },
  card: {
    maxWidth: "760px",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "var(--shadow-sm)"
  },
  counter: {
    fontSize: "13px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#6b7280"
  },
  difficulty: {
    marginTop: "4px",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.04em",
    color: "#1f4f46"
  },
  title: {
    fontSize: "clamp(1.6rem, 3.8vw, 2.2rem)",
    marginTop: "6px"
  },
  question: {
    marginTop: "14px",
    lineHeight: 1.6,
    color: "#334155"
  },
  optionsWrap: {
    marginTop: "16px",
    display: "grid",
    gap: "9px"
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "10px 12px",
    background: "var(--bg-soft)"
  },
  button: {
    marginTop: "16px",
    padding: "11px 16px",
    borderRadius: "10px",
    border: "none",
    background: "var(--brand)",
    color: "white",
    fontWeight: "700",
    cursor: "pointer"
  },
  summary: {
    marginTop: "10px"
  },
  status: {
    marginTop: "8px",
    fontWeight: "800"
  },
  resultActions: {
    marginTop: "16px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  reviewWrap: {
    marginTop: "14px",
    borderTop: "1px solid var(--border)",
    paddingTop: "12px"
  },
  reviewTitle: {
    margin: 0,
    fontSize: "1.05rem"
  },
  reviewRow: {
    marginTop: "10px",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "10px",
    background: "var(--bg-soft)"
  },
  reviewQuestion: {
    margin: 0,
    fontWeight: "700"
  },
  reviewText: {
    margin: "6px 0 0"
  },
  reviewExplain: {
    margin: "6px 0 0",
    color: "#334155"
  },
  buttonLink: {
    display: "inline-block",
    padding: "11px 16px",
    borderRadius: "10px",
    border: "none",
    background: "var(--brand)",
    color: "white",
    fontWeight: "700",
    textDecoration: "none"
  },
  buttonSecondary: {
    padding: "11px 16px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "white",
    color: "var(--text)",
    fontWeight: "700",
    cursor: "pointer"
  }
};
