import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const UserContext = createContext(null);

// ✅ SAFE LOCALSTORAGE HELPER: Prevents Vercel build crashes
const safeLocalStorage = typeof window !== "undefined" ? window.localStorage : null;

const getStoredUser = () => {
  if (!safeLocalStorage) return null;
  try {
    const value = JSON.parse(
      safeLocalStorage.getItem("userInfo") || safeLocalStorage.getItem("user") || "null"
    );
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
};

export function UserContextProvider({ children }) {
  // ✅ SAFE: Only read tokens if in browser
  const initialToken = safeLocalStorage ? (safeLocalStorage.getItem("userToken") || safeLocalStorage.getItem("token")) : null;
  const initialSession = safeLocalStorage ? safeLocalStorage.getItem("userSessionVersion") : null;
  
  const [token, setToken] = useState(initialToken);
  const [user, setUser] = useState(getStoredUser);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(initialToken && getStoredUser()));
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
      const currentToken = safeLocalStorage ? (safeLocalStorage.getItem("userToken") || safeLocalStorage.getItem("token")) : null;
      const currentSession = safeLocalStorage ? safeLocalStorage.getItem("userSessionVersion") : null;
      const expiredToken = event.detail?.token;
      const expiredSession = event.detail?.session;
      
      if (currentToken && currentToken !== expiredToken) return;
      if (currentSession && currentSession !== expiredSession) return;
      
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsAuthLoading(false);
    };
    
    if (typeof window !== "undefined") {
      window.addEventListener("noted:auth-expired", expireSession);
    }

    const fetchUserData = async () => {
      const storedToken = safeLocalStorage ? (safeLocalStorage.getItem("userToken") || safeLocalStorage.getItem("token")) : null;
      const storedSession = safeLocalStorage ? safeLocalStorage.getItem("userSessionVersion") : null;
      
      if (!storedToken) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me", { headers: { Authorization: `Bearer ${storedToken}` } });
        const userData = response.data.data || response.data;
        
        if ((safeLocalStorage ? (safeLocalStorage.getItem("userToken") || safeLocalStorage.getItem("token")) : null) !== storedToken || 
            (safeLocalStorage ? safeLocalStorage.getItem("userSessionVersion") : null) !== storedSession) return;
        
        const cleanUserData = {
          ...userData,
          role: userData.role?.replace(/"/g, '') || userData.role
        };
        
        setUser(cleanUserData);
        if (safeLocalStorage) {
          safeLocalStorage.setItem("userInfo", JSON.stringify(cleanUserData));
          safeLocalStorage.setItem("user", JSON.stringify(cleanUserData));
        }
        setIsAuthenticated(true);
      } catch (error) {
        console.error("[Auth] Session verification failed:", error.message);
        if (error.response?.status === 401 && 
            (safeLocalStorage ? (safeLocalStorage.getItem("userToken") || safeLocalStorage.getItem("token")) : null) === storedToken && 
            (safeLocalStorage ? safeLocalStorage.getItem("userSessionVersion") : null) === storedSession) {
          
          if (safeLocalStorage) {
            safeLocalStorage.removeItem("userToken");
            safeLocalStorage.removeItem("token");
            safeLocalStorage.removeItem("userInfo");
            safeLocalStorage.removeItem("user");
            safeLocalStorage.removeItem("userSessionVersion");
            safeLocalStorage.removeItem("noted_ai_tutor_messages");
          }
          delete api.defaults.headers.common.Authorization;
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!(safeLocalStorage ? (safeLocalStorage.getItem("userToken") || safeLocalStorage.getItem("token")) : null) || 
            ((safeLocalStorage ? (safeLocalStorage.getItem("userToken") || safeLocalStorage.getItem("token")) : null) === storedToken && 
             (safeLocalStorage ? safeLocalStorage.getItem("userSessionVersion") : null) === storedSession)) {
          setIsAuthLoading(false);
        }
      }
    };

    fetchUserData();
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("noted:auth-expired", expireSession);
      }
    };
  }, []);

  const login = (userData, authToken) => {
    if (!authToken || !userData?.role) throw new Error("[Auth] Login response is missing the user or token.");
    const normalizedUser = {
      ...userData,
      email: typeof userData.email === "string" ? userData.email.trim().toLowerCase() : userData.email,
      role: typeof userData.role === "string" ? userData.role.replace(/"/g, "") : userData.role,
    };
    
    if (safeLocalStorage) {
      safeLocalStorage.setItem("userToken", authToken);
      safeLocalStorage.setItem("token", authToken);
      safeLocalStorage.setItem("userInfo", JSON.stringify(normalizedUser));
      safeLocalStorage.setItem("user", JSON.stringify(normalizedUser));
      safeLocalStorage.setItem("userSessionVersion", globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
    
    api.defaults.headers.common.Authorization = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(normalizedUser);
    setIsAuthenticated(true);
    setIsAuthLoading(false);
    return normalizedUser;
  };

  const logout = () => {
    if (safeLocalStorage) {
      safeLocalStorage.removeItem("userToken");
      safeLocalStorage.removeItem("token");
      safeLocalStorage.removeItem("userInfo");
      safeLocalStorage.removeItem("user");
      safeLocalStorage.removeItem("userSessionVersion");
      safeLocalStorage.removeItem("noted_ai_tutor_messages");
    }
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prevUser) => {
      const nextUser = { ...prevUser, ...updatedFields };
      if (safeLocalStorage) {
        safeLocalStorage.setItem("userInfo", JSON.stringify(nextUser));
        safeLocalStorage.setItem("user", JSON.stringify(nextUser));
      }
      return nextUser;
    });
  };

  const refreshUser = async () => {
    const currentToken = safeLocalStorage ? (safeLocalStorage.getItem("userToken") || safeLocalStorage.getItem("token")) : null;
    if (!currentToken) return null;
    try {
      const response = await api.get("/auth/me", { headers: { Authorization: `Bearer ${currentToken}` } });
      const data = response.data.data || response.data;
      const clean = { ...data, role: data.role?.replace(/"/g, "") || data.role };
      setUser(clean);
      if (safeLocalStorage) {
        safeLocalStorage.setItem("userInfo", JSON.stringify(clean));
        safeLocalStorage.setItem("user", JSON.stringify(clean));
      }
      return clean;
    } catch (error) {
      console.error("Failed to refresh user:", error);
      return null;
    }
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
        refreshUser, // ✅ Make sure this is exposed!
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
