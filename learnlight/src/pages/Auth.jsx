import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Auth({ mode = "login" }) {
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const initialMode = useMemo(
    () => (mode === "signup" ? "signup" : "login"),
    [mode]
  );
  const [authMode, setAuthMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cohort, setCohort] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const success =
      authMode === "signup"
        ? await signup(name, email, password, cohort)
        : await login(email, password);

    if (success) {
      navigate("/dashboard");
      return;
    }

    alert(
      authMode === "signup"
        ? "Signup failed. Check if email already exists."
        : "Invalid credentials"
    );
  }

  return (
    <div style={styles.wrapper} className="page-enter">
      <div style={styles.card} className="subtle-slide-in">
        <h1 style={styles.title}>{authMode === "signup" ? "Create Account" : "Welcome Back"}</h1>
        <p style={styles.subtitle}>
          {authMode === "signup"
            ? "Create your learner profile and start building momentum."
            : "Login to continue your lessons and track progress."}
        </p>

        <div style={styles.toggleRow}>
          <button
            style={authMode === "login" ? styles.activeTab : styles.tab}
            onClick={() => setAuthMode("login")}
            type="button"
            className="interactive-button"
          >
            Login
          </button>
          <button
            style={authMode === "signup" ? styles.activeTab : styles.tab}
            onClick={() => setAuthMode("signup")}
            type="button"
            className="interactive-button"
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {authMode === "signup" && (
            <>
              <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
              />
              <input
                placeholder="Cohort (optional)"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                style={styles.input}
              />
            </>
          )}

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.submit} className="interactive-button">
            {authMode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
      </div>

      <aside style={styles.sidePanel} className="interactive-card subtle-slide-in">
        <img
          src="/learner-studying.svg"
          alt="Learner reading and studying"
          style={styles.sideImage}
        />
        <p style={styles.sideKicker}>Learning journey</p>
        <h2 style={styles.sideTitle}>
          Build knowledge daily, one focused session at a time.
        </h2>
        <p style={styles.sideText}>
          Join learners building consistent habits with quizzes, certificates,
          reminders, and offline-first lesson packs.
        </p>
        <div style={styles.bulletList}>
          <p style={styles.bulletItem}>Track progress</p>
          <p style={styles.bulletItem}>Earn certificates</p>
          <p style={styles.bulletItem}>Build streaks</p>
        </div>
        <div style={styles.sideStatRow}>
          <span style={styles.sideStat}>12 Learning Tracks</span>
          <span style={styles.sideStat}>Backend Synced Progress</span>
        </div>
      </aside>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "44px 24px 70px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    alignItems: "stretch"
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "var(--shadow-sm)",
    minHeight: "100%"
  },
  title: {
    fontSize: "2rem"
  },
  subtitle: {
    marginTop: "8px",
    lineHeight: 1.55
  },
  toggleRow: {
    display: "flex",
    gap: "8px",
    marginTop: "16px",
    marginBottom: "14px"
  },
  tab: {
    border: "1px solid var(--border)",
    background: "#fff",
    borderRadius: "999px",
    padding: "8px 13px",
    cursor: "pointer",
    fontWeight: "700"
  },
  activeTab: {
    border: "1px solid var(--brand)",
    background: "var(--brand)",
    color: "#fff",
    borderRadius: "999px",
    padding: "8px 13px",
    cursor: "pointer",
    fontWeight: "700"
  },
  form: {
    display: "grid",
    gap: "10px"
  },
  input: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    fontSize: "14px"
  },
  submit: {
    marginTop: "4px",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "none",
    background: "var(--brand)",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer"
  },
  sidePanel: {
    borderRadius: "18px",
    border: "1px solid #d5cab5",
    background:
      "linear-gradient(160deg, rgba(249,243,231,0.92), rgba(243,234,216,0.9)), url('/student-study-hero-2.svg') center/cover no-repeat",
    padding: "24px",
    boxShadow: "var(--shadow-sm)",
    display: "grid",
    gap: "10px",
    alignContent: "start"
  },
  sideKicker: {
    textTransform: "uppercase",
    letterSpacing: "0.11em",
    fontSize: "12px",
    color: "#6b7280"
  },
  sideImage: {
    width: "100%",
    borderRadius: "12px",
    border: "1px solid #d8cdb9",
    boxShadow: "0 8px 18px rgba(20,35,50,0.1)"
  },
  sideTitle: {
    fontSize: "clamp(1.3rem, 2.9vw, 2rem)",
    lineHeight: 1.2
  },
  sideText: {
    lineHeight: 1.65
  },
  bulletList: {
    marginTop: "6px",
    display: "grid",
    gap: "6px"
  },
  bulletItem: {
    background: "rgba(255,255,255,0.66)",
    border: "1px solid #e5dac6",
    borderRadius: "10px",
    padding: "8px 10px",
    color: "#314252",
    fontWeight: "600",
    fontSize: "14px"
  },
  sideStatRow: {
    marginTop: "6px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  sideStat: {
    border: "1px solid #d7ccb9",
    borderRadius: "999px",
    background: "#fff",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#1f2a37"
  }
};
