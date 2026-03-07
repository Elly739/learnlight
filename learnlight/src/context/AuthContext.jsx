import { createContext, useContext, useState, useEffect } from "react";
import { authLogin, authRegister, updateMyProfile } from "../api";

const AuthContext = createContext();

function deriveNameFromEmail(email) {
  if (!email || typeof email !== "string") return "Learner";
  const local = email.split("@")[0] || "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "Learner";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  function login(email, password) {
    return authLogin(email, password)
      .then((data) => {
        const token = data.token;
        let previousUser = null;
        try {
          previousUser = JSON.parse(localStorage.getItem("user") || "null");
        } catch (e) {}
        const u = {
          id: data.user?.id || null,
          name:
            data.user?.name ||
            previousUser?.name ||
            deriveNameFromEmail(data.user?.email || email),
          email: data.user?.email || email,
          role: data.user?.role || previousUser?.role || "student",
          cohort: data.user?.cohort || previousUser?.cohort || null,
          token
        };
        localStorage.setItem("user", JSON.stringify(u));
        setUser(u);
        return true;
      })
      .catch(() => false);
  }

  function signup(name, email, password, cohort = null) {
    return authRegister(name, email, password, cohort)
      .then((data) => {
        const token = data.token;
        const u = {
          id: data.user?.id || null,
          name:
            data.user?.name ||
            name ||
            deriveNameFromEmail(data.user?.email || email),
          email: data.user?.email || email,
          role: data.user?.role || "student",
          cohort: data.user?.cohort || null,
          token
        };
        localStorage.setItem("user", JSON.stringify(u));
        setUser(u);
        return true;
      })
      .catch(() => false);
  }

  async function saveProfile({ name, cohort }) {
    try {
      const data = await updateMyProfile({ name, cohort });
      const current = user || {};
      const nextUser = {
        ...current,
        ...data.user
      };
      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
      return true;
    } catch (e) {
      return false;
    }
  }

  function logout() {
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, saveProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
