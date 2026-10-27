import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api"; // Adjust path if your utils folder is elsewhere

const UserContext = createContext(null);

export function UserContextProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("userToken"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("userInfo") || "null"); }
    catch { return null; }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem("userToken") && localStorage.getItem("userInfo")));
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
      const currentToken = localStorage.getItem("userToken");
      const currentSession = localStorage.getItem("userSessionVersion");
      const expiredToken = event.detail?.token;
      const expiredSession = event.detail?.session;
      if (currentToken && currentToken !== expiredToken) return;
      if (currentSession && currentSession !== expiredSession) return;
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsAuthLoading(false);
    };
    window.addEventListener("noted:auth-expired", expireSession);

    const fetchUserData = async () => {
      const storedToken = localStorage.getItem("userToken");
      const storedSession = localStorage.getItem("userSessionVersion");
      if (!storedToken) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me", { headers: { Authorization: `Bearer ${storedToken}` } });
        const userData = response.data.data || response.data;
        // Ignore late responses from a session that has already been replaced.
        if (localStorage.getItem("userToken") !== storedToken || localStorage.getItem("userSessionVersion") !== storedSession) return;
        
        // ✅ Clean the role field here too
        const cleanUserData = {
          ...userData,
          role: userData.role?.replace(/"/g, '') || userData.role
        };
        
        setUser(cleanUserData);
        localStorage.setItem("userInfo", JSON.stringify(cleanUserData));
        setIsAuthenticated(true);
      } catch (error) {
        console.error("[Auth] Session verification failed:", error.message);
        // Only a confirmed 401 expires the same token. Network/5xx failures should
        // leave a cached session intact so a temporary outage doesn't log users out.
        if (error.response?.status === 401 && localStorage.getItem("userToken") === storedToken && localStorage.getItem("userSessionVersion") === storedSession) {
          localStorage.removeItem("userToken");
          localStorage.removeItem("userInfo");
          localStorage.removeItem("userSessionVersion");
          delete api.defaults.headers.common.Authorization;
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!localStorage.getItem("userToken") || (localStorage.getItem("userToken") === storedToken && localStorage.getItem("userSessionVersion") === storedSession)) setIsAuthLoading(false);
      }
    };

    fetchUserData();
    return () => window.removeEventListener("noted:auth-expired", expireSession);
  }, []);

  const login = (userData, authToken) => {
    if (!authToken || !userData?.role) throw new Error("[Auth] Login response is missing the user or token.");
    const normalizedUser = {
      ...userData,
      email: typeof userData.email === "string" ? userData.email.trim().toLowerCase() : userData.email,
      role: typeof userData.role === "string" ? userData.role.replace(/"/g, "") : userData.role,
    };
    // Persist and expose the session synchronously before the caller navigates.
    localStorage.setItem("userToken", authToken);
    localStorage.setItem("userInfo", JSON.stringify(normalizedUser));
    localStorage.setItem("userSessionVersion", globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    api.defaults.headers.common.Authorization = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(normalizedUser);
    setIsAuthenticated(true);
    setIsAuthLoading(false);
    return normalizedUser;
  };

  const logout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("userSessionVersion");
    delete api.defaults.headers.common.Authorization;
    // Optional: Clear AI tutor chat history on logout for privacy
    localStorage.removeItem("noted_ai_tutor_messages"); 
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    window.location.replace("/login"); 
  };

  const updateUser = (updatedFields) => {
    setUser((prevUser) => {
      const nextUser = { ...prevUser, ...updatedFields };
      localStorage.setItem("userInfo", JSON.stringify(nextUser));
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
        formState, 
        setPage, 
        updateUserField 
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
