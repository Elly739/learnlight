import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifyCertificate } from "../api";

export default function Certificate() {
  const { certId } = useParams();
  const { user } = useAuth();
  const [cert, setCert] = useState(null);

  useEffect(() => {
    if (!certId) return;
    verifyCertificate(certId)
      .then((data) => setCert(data))
      .catch(() => setCert(null));
  }, [certId]);

  const learnerName = useMemo(() => {
    if (cert?.learnerName && String(cert.learnerName).trim()) return String(cert.learnerName).trim();
    if (user?.name && String(user.name).trim()) return String(user.name).trim();
    return "Learner";
  }, [cert, user]);

  const title = cert?.lessonTitle
    ? `${cert.lessonTitle} Completion Certificate`
    : "Lesson Completion Certificate";

  const issueDate = cert?.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

  const verifyUrl = certId
    ? `${window.location.origin}/verify/${encodeURIComponent(certId)}`
    : "";

  return (
    <div style={styles.wrapper} className="page-enter">
      <div style={styles.card}>
        <p style={styles.kicker}>LearnLight Certification</p>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.line}>This certifies that</p>
        <h2 style={styles.name}>{learnerName}</h2>
        <p style={styles.line}>has successfully met the requirements for this award.</p>
        <p style={styles.date}>Issued on {issueDate}</p>

        <div style={styles.verifyBlock}>
          <p style={styles.certId}>Certificate ID: {certId || "N/A"}</p>
          {verifyUrl && (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`}
              alt="Certificate verification QR"
              style={styles.qr}
            />
          )}
          {verifyUrl && (
            <a href={verifyUrl} target="_blank" rel="noreferrer" style={styles.verifyLink}>
              Verify Certificate
            </a>
          )}
        </div>
      </div>

      <button onClick={() => window.print()} style={styles.button}>
        Save as PDF / Print
      </button>
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
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    boxShadow: "var(--shadow-lg)",
    padding: "34px 24px",
    textAlign: "center"
  },
  kicker: {
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: "12px"
  },
  title: {
    marginTop: "8px",
    fontSize: "clamp(1.9rem, 4vw, 2.8rem)"
  },
  line: {
    marginTop: "14px",
    lineHeight: 1.6
  },
  name: {
    marginTop: "12px",
    fontSize: "clamp(1.7rem, 3.6vw, 2.5rem)",
    color: "var(--brand)"
  },
  date: {
    marginTop: "20px",
    fontSize: "14px"
  },
  verifyBlock: {
    marginTop: "18px",
    display: "grid",
    justifyItems: "center",
    gap: "8px"
  },
  certId: {
    fontSize: "13px",
    color: "#5b6877"
  },
  qr: {
    width: "120px",
    height: "120px",
    border: "1px solid var(--border)",
    borderRadius: "8px"
  },
  verifyLink: {
    color: "var(--brand)",
    fontWeight: "700",
    textDecoration: "none"
  },
  button: {
    marginTop: "16px",
    border: "none",
    borderRadius: "10px",
    padding: "11px 16px",
    background: "var(--brand)",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer"
  }
};
