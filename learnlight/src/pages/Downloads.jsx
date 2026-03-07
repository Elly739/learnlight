import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  addMyDownload,
  getDownloads,
  getMyLearnerDownloads,
  updateMyDownload
} from "../api";

export default function Downloads() {
  const [downloads, setDownloads] = useState([]);
  const [catalogDownloads, setCatalogDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  function humanSize(bytes) {
    const n = Number(bytes) || 0;
    if (n <= 0) return "Unknown";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function estimateSizeBytes(item) {
    const base = 220 * 1024;
    const descBoost = Math.min(320 * 1024, String(item.description || "").length * 70);
    const lessonBoost = item.lesson_id ? 180 * 1024 : 90 * 1024;
    return base + descBoost + lessonBoost;
  }

  function mergeDownloads(learnerDownloads = [], catalog = []) {
    const out = [];
    const seen = new Set();
    const keyFor = (x) =>
      `${x.lesson_id || "na"}|${x.filename || "na"}|${x.subject_name || "na"}|${x.download_type || "na"}`;

    for (const item of learnerDownloads) {
      const k = keyFor(item);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(item);
    }

    for (const item of catalog) {
      const k = keyFor(item);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        ...item,
        download_type: item.download_type || "resource",
        status: "not-downloaded",
        file_size_bytes: estimateSizeBytes(item),
        last_updated_at: null
      });
    }
    return out;
  }

  async function loadDownloads() {
    setLoading(true);
    try {
      const catalog = await getDownloads();
      setCatalogDownloads(catalog || []);
      let learner = [];
      try {
        learner = await getMyLearnerDownloads();
      } catch (e) {
        learner = [];
      }
      setDownloads(mergeDownloads(learner || [], catalog || []));
    } catch (e) {
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDownloads().catch(() => {});
  }, []);

  async function downloadAll() {
    if (!catalogDownloads.length) return;
    setBulkLoading(true);
    try {
      for (const item of catalogDownloads) {
        if (!item.lesson_id) continue;
        await addMyDownload({
          lessonId: Number(item.lesson_id),
          filename: item.filename,
          url: item.url || null,
          description: item.description || null,
          downloadType: "resource",
          status: "downloaded",
          fileSizeBytes: estimateSizeBytes(item)
        });
      }
      await loadDownloads();
      alert("All downloads saved to your download center.");
    } catch (e) {
      alert("Please login to use Download All.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function setStatus(download, status) {
    if (!download?.id) return;
    try {
      const res = await updateMyDownload(download.id, {
        status,
        fileSizeBytes: download.file_size_bytes || 0
      });
      const updated = res?.download;
      setDownloads((prev) =>
        prev.map((d) => (Number(d.id) === Number(download.id) ? { ...d, ...updated } : d))
      );
    } catch (e) {
      alert("Unable to update status.");
    }
  }

  async function resumeDownload(download) {
    if (!download?.id) return;
    try {
      await updateMyDownload(download.id, {
        status: "downloading",
        fileSizeBytes: download.file_size_bytes || 0
      });
      const res = await updateMyDownload(download.id, {
        status: "downloaded",
        fileSizeBytes: download.file_size_bytes || estimateSizeBytes(download)
      });
      const updated = res?.download;
      setDownloads((prev) =>
        prev.map((d) => (Number(d.id) === Number(download.id) ? { ...d, ...updated } : d))
      );
    } catch (e) {
      alert("Unable to resume download.");
    }
  }

  return (
    <div style={styles.wrapper} className="page-enter">
      <h1 style={styles.title}>Downloads</h1>
      <div style={styles.topActions}>
        <button style={styles.primaryButton} onClick={downloadAll} disabled={bulkLoading}>
          {bulkLoading ? "Downloading all..." : "Download All"}
        </button>
      </div>

      {!loading && downloads.length === 0 ? (
        <p style={styles.empty}>No downloads available yet.</p>
      ) : (
        <div style={styles.grid} className="stagger-grid">
          {loading
            ? [1, 2, 3, 4].map((n) => (
                <div key={`dl-sk-${n}`} className="skeleton-box" style={styles.skeletonCard} />
              ))
            : downloads.map((d, index) => (
                <div key={`${d.id || "item"}-${index}`} style={styles.card} className="interactive-card">
                  <h3 style={styles.cardTitle}>{d.filename}</h3>
                  {d.description && <p style={styles.desc}>{d.description}</p>}
                  {d.subject_name && <p style={styles.meta}>Subject: {d.subject_name}</p>}
                  {d.download_type === "lesson" && <p style={styles.meta}>Type: Full lesson package</p>}
                  {d.status && <p style={styles.meta}>Status: {d.status}</p>}
                  <p style={styles.meta}>Size: {humanSize(d.file_size_bytes)}</p>
                  <p style={styles.meta}>
                    Last Updated:{" "}
                    {d.last_updated_at
                      ? new Date(d.last_updated_at).toLocaleString()
                      : "N/A"}
                  </p>
                  {d.url && (
                    <a href={d.url} style={styles.link} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  )}
                  {d.lesson_id && (
                    <div style={{ marginTop: 8 }}>
                      <Link to={`/lessons/${d.lesson_id}`} style={styles.link}>
                        View Lesson
                      </Link>
                    </div>
                  )}
                  {d.id ? (
                    <div style={styles.statusActions}>
                      <select
                        value={d.status || "downloaded"}
                        onChange={(e) => setStatus(d, e.target.value)}
                        style={styles.select}
                      >
                        <option value="downloaded">downloaded</option>
                        <option value="downloading">downloading</option>
                        <option value="paused">paused</option>
                        <option value="failed">failed</option>
                      </select>
                      {(d.status === "paused" || d.status === "failed") && (
                        <button style={styles.resumeButton} onClick={() => resumeDownload(d)}>
                          Resume
                        </button>
                      )}
                    </div>
                  ) : (
                    <p style={styles.meta}>Not yet downloaded.</p>
                  )}
                </div>
              ))}
        </div>
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
  title: {
    fontSize: "clamp(1.9rem, 4.2vw, 2.6rem)"
  },
  empty: {
    marginTop: "12px"
  },
  topActions: {
    marginTop: "10px",
    display: "flex",
    gap: "8px"
  },
  primaryButton: {
    border: "none",
    borderRadius: "8px",
    background: "var(--brand)",
    color: "#fff",
    padding: "10px 12px",
    fontWeight: "700",
    cursor: "pointer"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "14px",
    marginTop: "14px"
  },
  card: {
    padding: "16px",
    borderRadius: "14px",
    border: "1px solid var(--border)",
    background: "var(--card)",
    boxShadow: "var(--shadow-sm)"
  },
  cardTitle: {
    fontSize: "1rem"
  },
  desc: {
    marginTop: "8px"
  },
  meta: {
    marginTop: "6px",
    opacity: 0.8,
    fontSize: "14px"
  },
  link: {
    display: "inline-block",
    marginTop: "10px",
    color: "var(--brand)",
    fontWeight: "700",
    textDecoration: "none"
  },
  statusActions: {
    marginTop: "10px",
    display: "flex",
    gap: "8px",
    alignItems: "center"
  },
  select: {
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid var(--border)"
  },
  resumeButton: {
    border: "none",
    borderRadius: "8px",
    background: "#0f766e",
    color: "#fff",
    padding: "8px 10px",
    fontWeight: "700",
    cursor: "pointer"
  },
  skeletonCard: {
    height: "150px",
    borderRadius: "14px"
  }
};
