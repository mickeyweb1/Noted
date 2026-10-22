import { Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "../context/userContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isAuthLoading, user } = useUserContext();
  const location = useLocation();

  if (isAuthLoading || (isAuthenticated && !user)) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const adminRoles = ["school_admin", "super_admin"];
    const destination = adminRoles.includes(user.role)
      ? "/admin/dashboard"
      : "/dashboard";

    if (location.pathname !== destination) {
      return <Navigate to={destination} replace />;
    }

    return null;
  }

  return children;
}
