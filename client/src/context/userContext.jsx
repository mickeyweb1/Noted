import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api"; // Adjust path if your utils folder is elsewhere

const UserContext = createContext(null);

export function UserContextProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("userToken"));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
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
    const fetchUserData = async () => {
      const storedToken = localStorage.getItem("userToken");
      if (!storedToken) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const userData = response.data.data || response.data;
        
        // ✅ Clean the role field here too
        const cleanUserData = {
          ...userData,
          role: userData.role?.replace(/"/g, '') || userData.role
        };
        
        setUser(cleanUserData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to fetch user data, logging out");
        localStorage.removeItem("userToken");
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const login = (userData, authToken) => {
    localStorage.setItem("userToken", authToken);
    setToken(authToken);
    setUser(userData);
    setIsAuthenticated(true);
    setIsAuthLoading(false);
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
