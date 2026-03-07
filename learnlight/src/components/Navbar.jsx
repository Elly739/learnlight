import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const canAccessAdmin = ["admin", "editor", "support"].includes(user?.role);

  return (
    <header style={styles.wrap}>
      <nav style={styles.nav}>
        <h2 style={styles.logo}>LearnLight</h2>

        <div style={styles.links}>
          <NavLink to="/" style={styles.link}>
            Home
          </NavLink>
          <NavLink to="/lessons" style={styles.link}>
            Lessons
          </NavLink>
          <NavLink to="/downloads" style={styles.link}>
            Downloads
          </NavLink>
          <NavLink to="/dashboard" style={styles.link}>
            Dashboard
          </NavLink>
          {canAccessAdmin && (
            <NavLink to="/admin" style={styles.link}>
              Admin
            </NavLink>
          )}
          {!user && (
            <NavLink to="/auth" style={styles.link}>
              Auth
            </NavLink>
          )}
          {user && (
            <button onClick={logout} style={styles.logoutButton}>
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

const styles = {
  wrap: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    backdropFilter: "blur(7px)",
    background: "rgba(253, 250, 242, 0.82)",
    borderBottom: "1px solid var(--border)"
  },
  nav: {
    maxWidth: "1120px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 24px"
  },
  logo: {
    color: "var(--brand)",
    letterSpacing: "0.02em"
  },
  links: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px"
  },
  link: ({ isActive }) => ({
    textDecoration: "none",
    color: isActive ? "#fff" : "var(--text)",
    background: isActive ? "var(--brand)" : "transparent",
    border: `1px solid ${isActive ? "var(--brand)" : "transparent"}`,
    borderRadius: "999px",
    padding: "7px 12px",
    fontWeight: isActive ? "700" : "600",
    transition: "all 0.2s ease"
  }),
  logoutButton: {
    border: "1px solid var(--border)",
    background: "#fff",
    borderRadius: "999px",
    padding: "7px 12px",
    color: "var(--text)",
    fontWeight: "700",
    cursor: "pointer"
  }
};
