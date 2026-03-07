import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={styles.wrapper} className="page-enter">
      <section style={styles.hero}>
        <div>
          <p style={styles.kicker}>Offline-first education platform</p>
          <h1 style={styles.title}>LearnLight</h1>
          <p style={styles.subtitle}>
            A focused learning experience for students in low-connectivity settings.
            Download subjects, track progress, and build consistency.
          </p>

          <div style={styles.actions}>
            <Link to="/lessons" style={styles.primaryLink} className="interactive-button">
              Browse Lessons
            </Link>
            <Link to="/dashboard" style={styles.secondaryLink} className="interactive-button">
              Open Dashboard
            </Link>
          </div>
        </div>

        <div style={styles.studyVisual} className="interactive-card subtle-slide-in">
          <div style={styles.studyGlow} />
          <img
            src="/learner-studying.svg"
            alt="Learner studying at a desk"
            style={styles.studyImage}
          />
          <p style={styles.visualTag}>Student Focus Session</p>
          <h3 style={styles.visualTitle}>Deep Work Environment</h3>
          <p style={styles.visualText}>
            Structured lessons, timed study blocks, and measurable progress in one place.
          </p>
          <div style={styles.visualStats}>
            <div style={styles.statChip}>Lessons: 12 tracks</div>
            <div style={styles.statChip}>Streak-ready</div>
            <div style={styles.statChip}>Offline packs</div>
          </div>
        </div>
      </section>

      <section style={styles.features} className="stagger-grid">
        {[
          {
            icon: "📘",
            title: "Offline Resource Packs",
            text: "Download full lessons or specific subjects and learn without interruptions."
          },
          {
            icon: "🧠",
            title: "Progress Intelligence",
            text: "Track completion, quiz performance, streaks, and milestones in one dashboard."
          },
          {
            icon: "🚀",
            title: "Career-Ready Tracks",
            text: "Explore web, mobile, data, cloud, cybersecurity, and product strategy pathways."
          }
        ].map((item) => (
          <article
            key={item.title}
            style={styles.card}
            className="interactive-card"
          >
            <div style={styles.cardIcon}>{item.icon}</div>
            <h3 style={styles.cardTitle}>{item.title}</h3>
            <p style={styles.cardText}>{item.text}</p>
          </article>
        ))}
      </section>

      <section style={styles.impact}>
        <h2 style={styles.impactTitle}>Built for practical learning outcomes</h2>
        <p style={styles.impactText}>
          LearnLight combines structured content, measurable progress, and lightweight
          offline behavior to support daily learner momentum.
        </p>
      </section>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "48px 24px 70px"
  },
  hero: {
    background:
      "linear-gradient(120deg, rgba(8,45,58,0.9), rgba(9,52,66,0.82)), url('/student-study-hero.svg') center/cover no-repeat",
    color: "#fff",
    borderRadius: "24px",
    boxShadow: "var(--shadow-lg)",
    padding: "44px 36px",
    display: "grid",
    gap: "20px",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    alignItems: "center"
  },
  kicker: {
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    color: "rgba(255,255,255,0.78)",
    marginBottom: "10px"
  },
  title: {
    color: "#fff",
    fontSize: "clamp(2.1rem, 5vw, 3.3rem)",
    lineHeight: 1.05
  },
  subtitle: {
    color: "rgba(255,255,255,0.86)",
    marginTop: "16px",
    maxWidth: "670px",
    lineHeight: 1.7
  },
  actions: {
    marginTop: "28px",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px"
  },
  studyVisual: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.24)",
    background:
      "linear-gradient(165deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))",
    padding: "20px",
    backdropFilter: "blur(2px)",
    minHeight: "220px"
  },
  studyGlow: {
    position: "absolute",
    right: "-35px",
    top: "-35px",
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(245,158,11,0.45), rgba(245,158,11,0))"
  },
  visualTag: {
    marginTop: "8px",
    display: "inline-block",
    borderRadius: "999px",
    padding: "6px 10px",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.26)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.03em"
  },
  visualTitle: {
    marginTop: "12px",
    color: "#fff",
    fontSize: "1.35rem"
  },
  visualText: {
    marginTop: "8px",
    color: "rgba(255,255,255,0.88)",
    lineHeight: 1.55
  },
  visualStats: {
    marginTop: "14px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  statChip: {
    background: "rgba(8,30,38,0.42)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "10px",
    padding: "7px 10px",
    fontSize: "12px",
    fontWeight: "700"
  },
  studyImage: {
    width: "100%",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.3)",
    display: "block"
  },
  primaryLink: {
    textDecoration: "none",
    background: "#f59e0b",
    color: "#1f2937",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700"
  },
  secondaryLink: {
    textDecoration: "none",
    background: "rgba(255,255,255,0.14)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.34)",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700"
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginTop: "24px"
  },
  card: {
    background: "var(--card)",
    borderRadius: "16px",
    padding: "22px",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)",
    animationFillMode: "both"
  },
  cardIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(140deg, #fef3c7, #fce7a8)",
    border: "1px solid #f1dfab",
    fontSize: "20px"
  },
  cardTitle: {
    fontSize: "1.05rem",
    marginBottom: "8px"
  },
  cardText: {
    lineHeight: 1.6
  },
  impact: {
    marginTop: "24px",
    background: "var(--bg-soft)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "24px"
  },
  impactTitle: {
    fontSize: "1.75rem"
  },
  impactText: {
    marginTop: "10px",
    maxWidth: "760px",
    lineHeight: 1.65
  }
};
