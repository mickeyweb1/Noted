import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const UserContext = createContext(null);

// ── Canonical storage keys ──────────────────────────────────────────────────
const KEY_TOKEN   = "userToken";
const KEY_USER    = "userInfo";
const KEY_SESSION = "userSessionVersion";

// One-time migration: if a session was saved under the old duplicate keys,
// promote it to the canonical keys so existing users are not logged out.
const migrateStorage = () => {
  if (!localStorage.getItem(KEY_TOKEN) && localStorage.getItem("token")) {
    localStorage.setItem(KEY_TOKEN, localStorage.getItem("token"));
  }
  if (!localStorage.getItem(KEY_USER) && localStorage.getItem("user")) {
    localStorage.setItem(KEY_USER, localStorage.getItem("user"));
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const getStoredUser = () => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY_USER) || "null");
    return value && typeof value === "object" ? value : null;
  } catch { return null; }
};

const getStoredToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(KEY_TOKEN);

export function UserContextProvider({ children }) {
  migrateStorage();

  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(getStoredToken() && getStoredUser()),
  );
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [formState, setFormState] = useState({
    page: "signin",
    fullName: "",
    email: "",
    avatar: null,
    signin: { email: "", password: "" },
    signup: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
    forgot: { email: "" },
  });

  useEffect(() => {
    const expireSession = (event) => {
      const currentToken   = localStorage.getItem(KEY_TOKEN);
      const currentSession = localStorage.getItem(KEY_SESSION);
      if (currentToken   && currentToken   !== event.detail?.token)   return;
      if (currentSession && currentSession !== event.detail?.session) return;
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsAuthLoading(false);
    };
    window.addEventListener("noted:auth-expired", expireSession);

    const fetchUserData = async () => {
      const storedToken   = localStorage.getItem(KEY_TOKEN);
      const storedSession = localStorage.getItem(KEY_SESSION);
      if (!storedToken) { setIsAuthLoading(false); return; }

      try {
        const response = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const userData = response.data.data || response.data;

        // Ignore late responses from a session that has already been replaced.
        if (
          localStorage.getItem(KEY_TOKEN)   !== storedToken ||
          localStorage.getItem(KEY_SESSION) !== storedSession
        ) return;

        const cleanUserData = {
          ...userData,
          role: userData.role?.replace(/"/g, "") || userData.role,
        };
        setUser(cleanUserData);
        localStorage.setItem(KEY_USER, JSON.stringify(cleanUserData));
        setIsAuthenticated(true);
      } catch (error) {
        console.error("[Auth] Session verification failed:", error.message);
        // Only a confirmed 401 expires the same token — network/5xx failures keep
        // the cached session intact so a temporary outage doesn't log users out.
        if (
          error.response?.status === 401 &&
          localStorage.getItem(KEY_TOKEN)   === storedToken &&
          localStorage.getItem(KEY_SESSION) === storedSession
        ) {
          localStorage.removeItem(KEY_TOKEN);
          localStorage.removeItem(KEY_USER);
          localStorage.removeItem(KEY_SESSION);
          delete api.defaults.headers.common.Authorization;
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (
          !localStorage.getItem(KEY_TOKEN) ||
          (
            localStorage.getItem(KEY_TOKEN)   === storedToken &&
            localStorage.getItem(KEY_SESSION) === storedSession
          )
        ) {
          setIsAuthLoading(false);
        }
      }
    };

    fetchUserData();
    return () => window.removeEventListener("noted:auth-expired", expireSession);
  }, []);

  const login = (userData, authToken) => {
    if (!authToken || !userData?.role) {
      throw new Error("[Auth] Login response is missing the user or token.");
    }
    const normalizedUser = {
      ...userData,
      email: typeof userData.email === "string"
        ? userData.email.trim().toLowerCase()
        : userData.email,
      role: typeof userData.role === "string"
        ? userData.role.replace(/"/g, "")
        : userData.role,
    };
    const sessionVersion =
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(KEY_TOKEN,   authToken);
    localStorage.setItem(KEY_USER,    JSON.stringify(normalizedUser));
    localStorage.setItem(KEY_SESSION, sessionVersion);
    api.defaults.headers.common.Authorization = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(normalizedUser);
    setIsAuthenticated(true);
    setIsAuthLoading(false);
    return normalizedUser;
  };

  const logout = () => {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_SESSION);
    localStorage.removeItem("noted_ai_tutor_messages");
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    window.location.replace("/login");
  };

  const updateUser = (updatedFields) => {
    setUser((prevUser) => {
      const nextUser = { ...prevUser, ...updatedFields };
      localStorage.setItem(KEY_USER, JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const setPage = (page) => setFormState((prev) => ({ ...prev, page }));

  const updateUserField = (section, field, value) => {
    setFormState((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const refreshUser = async () => {
    const currentToken = localStorage.getItem(KEY_TOKEN);
    if (!currentToken) return null;
    const response = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const data  = response.data.data || response.data;
    const clean = { ...data, role: data.role?.replace(/"/g, "") || data.role };
    setUser(clean);
    localStorage.setItem(KEY_USER, JSON.stringify(clean));
    return clean;
  };

  return (
    <UserContext.Provider
      value={{
        isAuthenticated,
        isAuthLoading,
        user,
        token,
        login,
        logout,
        updateUser,
        refreshUser,
        formState,
        setPage,
        updateUserField,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used inside a UserContextProvider");
  }
  return context;
}

export default UserContext;
