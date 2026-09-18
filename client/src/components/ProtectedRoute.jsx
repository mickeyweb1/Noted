import { Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "../context/userContext"; 

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useUserContext();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login, but save the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Optional: Role-based protection (e.g., only 'student' or 'school_admin')
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; 
  }

  return children;
}