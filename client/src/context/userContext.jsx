import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api"; // Adjust path if your utils folder is elsewhere

const UserContext = createContext(null);

export function UserContextProvider({ children }) {
  // 1. Initialize state safely
  const [token, setToken] = useState(() => localStorage.getItem("userToken"));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [user, setUser] = useState(null);
  
  const [formState, setFormState] = useState({
    page: "signin",
    fullName: "",
    email: "",
    avatar: null,
    signin: { email: "", password: "" },
    signup: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
    forgot: { email: "" },
  });

  // 2. ✅ SECURE: Fetch fresh user data on mount instead of trusting localStorage
  useEffect(() => {
    const fetchUserData = async () => {
      const storedToken = localStorage.getItem("userToken");
      if (storedToken) {
        try {
          const response = await api.get("/auth/me");
          setUser(response.data.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Failed to fetch user data, logging out");
          logout();
        }
      }
    };
    fetchUserData();
  }, []);

  // 3. ✅ SECURE: Only save the TOKEN to localStorage. User data stays in memory.
  const login = (userData, authToken) => {
    localStorage.setItem("userToken", authToken);
    setToken(authToken);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("userToken");
    // Optional: Clear AI tutor chat history on logout for privacy
    localStorage.removeItem("noted_ai_tutor_messages"); 
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    window.location.replace("/login"); 
  };

  // 4. ✅ SECURE: Update state only. Do not write sensitive user data to localStorage.
  const updateUser = (updatedFields) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedFields }));
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