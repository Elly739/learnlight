import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyCertificate } from "../api";

export default function VerifyCertificate() {
  const { certId } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!certId) return;
    setLoading(true);
    setError("");
    verifyCertificate(certId)
      .then((data) => setResult(data))
      .catch((e) => setError(e?.message || "Certificate not found"))
      .finally(() => setLoading(false));
  }, [certId]);

  if (loading) {
    return (
      <div style={styles.wrapper} className="page-enter">
        <div style={styles.card}>
          <h1 style={styles.title}>Verifying Certificate...</h1>
        </div>
      </div>
    );
  }

  const isValid = Boolean(result?.valid) && !error;
  const issuedAt = result?.issuedAt
    ? new Date(result.issuedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : "N/A";

  return (
    <div style={styles.wrapper} className="page-enter">
      <div style={styles.card}>
        <h1 style={styles.title}>Certificate Verification</h1>
        <p style={{ ...styles.status, color: isValid ? "#0f766e" : "#b91c1c" }}>
          {isValid ? "Valid Certificate" : "Certificate Not Valid"}
        </p>

        <div style={styles.info}>
          <p><strong>Certificate ID:</strong> {certId || "N/A"}</p>
          <p><strong>Learner:</strong> {result?.learnerName || result?.learnerEmail || "N/A"}</p>
          <p><strong>Lesson:</strong> {result?.lessonTitle || "N/A"}</p>
          <p><strong>Issued:</strong> {issuedAt}</p>
        </div>

        {!isValid && error ? <p style={styles.error}>{error}</p> : null}

        <div style={styles.actions}>
          <Link to="/" style={styles.button}>Back Home</Link>
        </div>
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
  title: {
    fontSize: "clamp(1.8rem, 3.8vw, 2.4rem)"
  },
  status: {
    marginTop: "8px",
    fontWeight: "800"
  },
  info: {
    marginTop: "14px",
    display: "grid",
    gap: "6px"
  },
  error: {
    marginTop: "10px",
    color: "#b91c1c"
  },
  actions: {
    marginTop: "14px",
    display: "flex",
    gap: "10px"
  },
  button: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: "10px",
    background: "var(--brand)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "700"
  }
};

