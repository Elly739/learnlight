import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getLessons,
  getMyEnrollments,
  getMyProgress,
  getWeeklyLeaderboard,
  getMyProfile,
  getDueReminders,
  getReminderPreferences,
  saveReminderPreferences
} from "../api";
import { useAuth } from "../context/AuthContext";
import { computeDashboardStats } from "../utils/dashboardStats";

export default function Dashboard() {
  const { user, saveProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    passedQuizzes: 0,
    downloadedLessonPackages: 0,
    downloadedSubjects: 0,
    progressPercent: 0,
    achievementBadges: [],
    certificates: []
  });
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [globalBoard, setGlobalBoard] = useState({ top: [], me: null });
  const [cohortBoard, setCohortBoard] = useState({ top: [], me: null, cohort: null });
  const [profileName, setProfileName] = useState("");
  const [profileCohort, setProfileCohort] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [reminderPrefs, setReminderPrefs] = useState({
    emailEnabled: false,
    pushEnabled: true,
    dailyTime: "18:00",
    timezone: "UTC"
  });
  const [savingReminderPrefs, setSavingReminderPrefs] = useState(false);
  const [continueLesson, setContinueLesson] = useState(null);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      getLessons(),
      getMyProgress(),
      getMyEnrollments(),
      getWeeklyLeaderboard({ scope: "global" }),
      getWeeklyLeaderboard({ scope: "mine" }),
      getMyProfile(),
      getReminderPreferences(),
      getDueReminders()
    ])
      .then(
        ([
          lessons,
          progress,
          enrollments,
          globalLeaderboard,
          mineLeaderboard,
          profile,
          loadedReminderPrefs,
          dueReminderData
        ]) => {
        const computedStats = computeDashboardStats(lessons, progress);
        setStats(computedStats);
        const lessonList = Array.isArray(lessons) ? lessons : [];
        const byId = new Map(lessonList.map((l) => [Number(l.id), l]));
        const completedSet = new Set((progress?.completedLessonIds || []).map((id) => Number(id)));
        const latestAttempts = [...(progress?.latestQuizByLesson || [])].sort((a, b) =>
          String(b.attemptedAt || "").localeCompare(String(a.attemptedAt || ""))
        );
        const latestAttemptLessonId = Number(latestAttempts[0]?.lessonId) || null;
        const latestEnrolledLessonId = Number((enrollments || [])[0]?.lesson_id) || null;
        const firstIncompleteLessonId = lessonList.find((l) => !completedSet.has(Number(l.id)))?.id || null;
        const nextLessonId = latestAttemptLessonId || latestEnrolledLessonId || Number(firstIncompleteLessonId) || null;
        const nextLesson = nextLessonId ? byId.get(Number(nextLessonId)) : null;
        setContinueLesson(
          nextLesson
            ? {
                id: Number(nextLesson.id),
                title: nextLesson.title,
                description: nextLesson.description || ""
              }
            : null
        );

        setStreak(Number(progress?.currentStreak) || 0);
        setLongestStreak(Number(progress?.longestStreak) || 0);
        setGlobalBoard({
          top: Array.isArray(globalLeaderboard?.top) ? globalLeaderboard.top : [],
          me: globalLeaderboard?.me || null
        });
        setCohortBoard({
          top: Array.isArray(mineLeaderboard?.top) ? mineLeaderboard.top : [],
          me: mineLeaderboard?.me || null,
          cohort: mineLeaderboard?.cohort || null
        });
        setProfileName(profile?.name || user?.name || "");
        setProfileCohort(profile?.cohort || user?.cohort || "");
          setReminderPrefs({
            emailEnabled: Boolean(loadedReminderPrefs?.emailEnabled),
            pushEnabled:
              loadedReminderPrefs?.pushEnabled == null
                ? true
                : Boolean(loadedReminderPrefs?.pushEnabled),
            dailyTime: loadedReminderPrefs?.dailyTime || "18:00",
            timezone: loadedReminderPrefs?.timezone || "UTC"
          });
          setReminders(Array.isArray(dueReminderData?.reminders) ? dueReminderData.reminders : []);
        }
      )
      .catch(() => {
        setStats((prev) => ({ ...prev }));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    const ok = await saveProfile({
      name: profileName,
      cohort: profileCohort
    });
    if (!ok) {
      setSavingProfile(false);
      alert("Profile update failed.");
      return;
    }
    try {
      const [globalLeaderboard, mineLeaderboard] = await Promise.all([
        getWeeklyLeaderboard({ scope: "global" }),
        getWeeklyLeaderboard({ scope: "mine" })
      ]);
      setGlobalBoard({
        top: Array.isArray(globalLeaderboard?.top) ? globalLeaderboard.top : [],
        me: globalLeaderboard?.me || null
      });
      setCohortBoard({
        top: Array.isArray(mineLeaderboard?.top) ? mineLeaderboard.top : [],
        me: mineLeaderboard?.me || null,
        cohort: mineLeaderboard?.cohort || null
      });
      alert("Profile updated.");
    } catch (e2) {
      alert("Profile updated, but leaderboard refresh failed.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveReminderPrefs(e) {
    e.preventDefault();
    setSavingReminderPrefs(true);
    try {
      await saveReminderPreferences(reminderPrefs);
      const due = await getDueReminders();
      setReminders(Array.isArray(due?.reminders) ? due.reminders : []);
      alert("Reminder preferences updated.");
    } catch (e2) {
      alert("Failed to save reminder preferences.");
    } finally {
      setSavingReminderPrefs(false);
    }
  }

  const trackerItems = useMemo(
    () => [
      {
        icon: "📚",
        label: "Lessons Completed",
        value: `${stats.completedLessons}/${stats.totalLessons}`
      },
      {
        icon: "📝",
        label: "Quizzes Passed",
        value: `${stats.passedQuizzes}/${stats.totalLessons}`
      },
      {
        icon: "🏅",
        label: "Certificates Earned",
        value: String((stats.certificates || []).filter((c) => c.unlocked && c.certId).length)
      },
      {
        icon: "🔥",
        label: "Current Streak",
        value: `${streak} day(s)`
      }
    ],
    [stats, streak]
  );

  return (
    <div style={styles.wrapper} className="page-enter">
      <h1 style={styles.title}>Dashboard</h1>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Progress Tracker</h2>
        <p style={styles.lead}>
          {stats.progressPercent}% completed ({stats.completedLessons} of {stats.totalLessons} lessons)
        </p>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progress, width: `${stats.progressPercent}%` }} />
        </div>

        <div style={styles.trackerGrid} className="stagger-grid">
          {loading
            ? [1, 2, 3, 4].map((i) => <div key={i} className="skeleton-box" style={styles.metricSkeleton} />)
            : trackerItems.map((item) => (
                <div key={item.label} style={styles.metricCard} className="interactive-card">
                  <span style={styles.metricIcon}>{item.icon}</span>
                  <p style={styles.metricLabel}>{item.label}</p>
                  <p style={styles.metricValue}>{item.value}</p>
                </div>
              ))}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Continue Learning</h2>
        {!continueLesson ? (
          <p style={styles.lead}>No active lesson yet. Start from the lessons library.</p>
        ) : (
          <div style={styles.continueRow} className="interactive-card">
            <div>
              <p style={styles.continueLabel}>Pick up where you left off</p>
              <p style={styles.continueTitle}>{continueLesson.title}</p>
              <p style={styles.continueDesc}>{continueLesson.description || "Open lesson to continue."}</p>
            </div>
            <Link to={`/lessons/${continueLesson.id}`} style={styles.button} className="interactive-button">
              Resume Lesson
            </Link>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Achievements</h2>
        {!loading && stats.achievementBadges.length === 0 && <p style={styles.lead}>No badges yet.</p>}
        <div className="stagger-grid">
          {loading
            ? [1, 2, 3].map((i) => <div key={i} className="skeleton-box" style={styles.badgeSkeleton} />)
            : stats.achievementBadges.map((badge) => (
                <p key={badge} style={styles.badgeRow} className="interactive-card">
                  {badge}
                </p>
              ))}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Certificates</h2>
        {stats.certificates.map((cert) => (
          <div key={cert.id} style={styles.certRow}>
            <div>
              <p style={styles.certTitle}>{cert.title}</p>
              <p style={styles.certRule}>{cert.reason}</p>
            </div>
            {cert.unlocked && cert.certId ? (
              <Link to={`/certificate/${cert.certId}`} style={styles.button} className="interactive-button">
                Open Certificate
              </Link>
            ) : (
              <span style={styles.locked}>Locked</span>
            )}
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Learning Streaks</h2>
        <p style={styles.lead}>Current Streak: {streak} day(s)</p>
        <p style={styles.lead}>Longest Streak: {longestStreak} day(s)</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Learning Reminders</h2>
        <p style={styles.lead}>Configure reminder channels and schedule for streak continuity and unfinished lessons.</p>
        <form onSubmit={handleSaveReminderPrefs} style={styles.reminderForm}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={Boolean(reminderPrefs.emailEnabled)}
              onChange={(e) =>
                setReminderPrefs((prev) => ({ ...prev, emailEnabled: e.target.checked }))
              }
            />
            Email reminders
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={Boolean(reminderPrefs.pushEnabled)}
              onChange={(e) =>
                setReminderPrefs((prev) => ({ ...prev, pushEnabled: e.target.checked }))
              }
            />
            Push reminders
          </label>
          <input
            type="time"
            value={reminderPrefs.dailyTime}
            onChange={(e) => setReminderPrefs((prev) => ({ ...prev, dailyTime: e.target.value }))}
            style={styles.input}
          />
          <input
            value={reminderPrefs.timezone}
            onChange={(e) => setReminderPrefs((prev) => ({ ...prev, timezone: e.target.value }))}
            placeholder="Timezone, e.g. Africa/Nairobi"
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={savingReminderPrefs}>
            {savingReminderPrefs ? "Saving..." : "Save Reminder Settings"}
          </button>
        </form>
        <div style={styles.listBlock}>
          {reminders.length === 0 ? (
            <p style={styles.lead}>No reminders due right now.</p>
          ) : (
            reminders.map((r, idx) => (
              <div key={`${r.type}-${idx}`} style={styles.reminderRow}>
                <p style={styles.reminderTitle}>{r.title}</p>
                <p style={styles.reminderText}>{r.message}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Profile & Cohort</h2>
        <p style={styles.lead}>Set your name and cohort to appear correctly on certificates and cohort leaderboards.</p>
        <form onSubmit={handleSaveProfile} style={styles.profileForm}>
          <input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Your full name"
            style={styles.input}
          />
          <input
            value={profileCohort}
            onChange={(e) => setProfileCohort(e.target.value)}
            placeholder="Cohort (e.g., CS-2026-A)"
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Weekly Leaderboard</h2>
        <p style={styles.lead}>Ranked by lessons completed, then average quiz score.</p>
        <LeaderboardTable
          title="Global Top 10"
          rows={globalBoard.top}
          me={globalBoard.me}
          loading={loading}
        />
        <LeaderboardTable
          title={cohortBoard.cohort ? `Cohort: ${cohortBoard.cohort}` : "Your Cohort"}
          rows={cohortBoard.top}
          me={cohortBoard.me}
          loading={loading}
          emptyText="No cohort ranking yet. Add a cohort to your user profile to enable this."
        />
      </div>
    </div>
  );
}

function LeaderboardTable({ title, rows, me, loading, emptyText = "No activity this week yet." }) {
  return (
    <div style={styles.leaderboardBlock}>
      <h3 style={styles.leaderboardTitle}>{title}</h3>
      {loading ? (
        <div className="skeleton-box" style={styles.badgeSkeleton} />
      ) : rows.length === 0 ? (
        <p style={styles.lead}>{emptyText}</p>
      ) : (
        <div style={styles.leaderboardTable}>
          {rows.map((row) => (
            <div key={`${title}-${row.userId}`} style={styles.leaderboardRow}>
              <span style={styles.rank}>#{row.rank}</span>
              <span style={styles.playerName}>{row.name || row.email || `User ${row.userId}`}</span>
              <span>{row.lessonsCompleted} lessons</span>
              <span>{row.avgQuizPercent}% avg</span>
            </div>
          ))}
        </div>
      )}
      {!loading && me && (
        <p style={styles.myRank}>
          Your rank: #{me.rank} ({me.lessonsCompleted} lessons, {me.avgQuizPercent}% avg)
        </p>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "42px 24px 70px",
    display: "grid",
    gap: "16px"
  },
  title: {
    fontSize: "clamp(1.95rem, 4.1vw, 2.7rem)"
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    boxShadow: "var(--shadow-sm)",
    padding: "22px"
  },
  sectionTitle: {
    fontSize: "1.6rem"
  },
  lead: {
    marginTop: "8px",
    lineHeight: 1.6
  },
  progressBar: {
    marginTop: "14px",
    height: "10px",
    background: "#e5e7eb",
    borderRadius: "999px",
    overflow: "hidden"
  },
  progress: {
    height: "100%",
    background: "linear-gradient(90deg, #0f766e, #16a34a)",
    transition: "width 0.6s ease"
  },
  profileForm: {
    marginTop: "12px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "10px",
    alignItems: "center"
  },
  input: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    fontSize: "14px"
  },
  checkboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px"
  },
  reminderForm: {
    marginTop: "12px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
    alignItems: "center"
  },
  listBlock: {
    marginTop: "12px",
    display: "grid",
    gap: "8px"
  },
  reminderRow: {
    border: "1px solid var(--border)",
    borderRadius: "10px",
    background: "var(--bg-soft)",
    padding: "10px"
  },
  reminderTitle: {
    margin: 0,
    fontWeight: "800"
  },
  reminderText: {
    margin: "6px 0 0",
    lineHeight: 1.5
  },
  trackerGrid: {
    marginTop: "16px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px"
  },
  metricCard: {
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "var(--bg-soft)",
    padding: "12px",
    position: "relative"
  },
  metricIcon: {
    position: "absolute",
    top: "10px",
    right: "10px",
    fontSize: "16px",
    opacity: 0.9
  },
  metricLabel: {
    margin: 0,
    opacity: 0.8,
    fontSize: "13px"
  },
  metricValue: {
    margin: "6px 0 0",
    fontWeight: "800",
    color: "var(--brand)",
    fontSize: "19px"
  },
  metricSkeleton: {
    height: "72px",
    borderRadius: "12px"
  },
  badgeRow: {
    marginTop: "8px",
    background: "#f8f6ef",
    border: "1px solid var(--border)",
    padding: "8px 10px",
    borderRadius: "9px"
  },
  badgeSkeleton: {
    marginTop: "8px",
    height: "38px",
    borderRadius: "9px"
  },
  certRow: {
    marginTop: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "10px 0",
    borderTop: "1px solid var(--border)"
  },
  certTitle: {
    margin: 0,
    fontWeight: "800",
    color: "#1f2a37"
  },
  certRule: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#5b6877"
  },
  button: {
    display: "inline-block",
    padding: "8px 14px",
    borderRadius: "8px",
    background: "var(--brand)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "700"
  },
  locked: {
    color: "#6b7280",
    fontWeight: "700"
  },
  leaderboardBlock: {
    marginTop: "12px"
  },
  leaderboardTitle: {
    margin: "6px 0 8px",
    fontSize: "1.1rem"
  },
  leaderboardTable: {
    display: "grid",
    gap: "8px"
  },
  leaderboardRow: {
    display: "grid",
    gridTemplateColumns: "70px 1fr 140px 110px",
    gap: "10px",
    alignItems: "center",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "10px",
    background: "var(--bg-soft)"
  },
  rank: {
    fontWeight: "800",
    color: "var(--brand)"
  },
  playerName: {
    fontWeight: "700"
  },
  myRank: {
    marginTop: "8px",
    fontWeight: "700",
    color: "#1f2a37"
  },
  continueRow: {
    marginTop: "10px",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "12px",
    background: "var(--bg-soft)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  continueLabel: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#5b6877",
    fontWeight: "700"
  },
  continueTitle: {
    marginTop: "4px",
    fontWeight: "800",
    color: "#1f2a37"
  },
  continueDesc: {
    marginTop: "4px",
    lineHeight: 1.5
  }
};
