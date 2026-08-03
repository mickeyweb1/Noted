import { createContext, useContext, useState } from "react";

const initialUserState = {
  page: "signin",
  fullName: "",
  email: "",
  avatar: null,
  signin: {
    email: "",
    password: "",
  },
  signup: {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  },
  forgot: {
    email: "",
  },
};

const UserContext = createContext(null);

export function UserContextProvider({ children }) {
  const [user, setUser] = useState(initialUserState);

  const setPage = (page) => {
    setUser((prev) => ({ ...prev, page }));
  };

  const updateUserField = (section, field, value) => {
    setUser((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const resetUser = () => {
    setUser(initialUserState);
  };

  const logout = () => {
    resetUser();
  };

  return (
    <UserContext.Provider
      value={{ user, setPage, updateUserField, resetUser, logout }}
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
