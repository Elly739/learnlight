import { Link } from "react-router-dom";
import subjects from "../data/subjects";

export default function Subjects() {
  return (
    <div style={{ padding: "40px", maxWidth: "800px" }}>
      <h1>Subjects</h1>
      <div style={{ marginTop: "20px" }}>
        {subjects.map((s) => (
          <Link key={s.id} to={`/subjects/${s.id}`} style={styles.card}>
            <h3 style={{ margin: 0 }}>{s.name}</h3>
            <p style={{ opacity: 0.7 }}>{s.level}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: "block",
    padding: "16px",
    marginTop: "12px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    textDecoration: "none",
    color: "#111827",
    background: "#fff"
  }
};
