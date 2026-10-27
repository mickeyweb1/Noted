import { Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "../context/userContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isAuthLoading, user } = useUserContext();
  const location = useLocation();

  if (isAuthLoading || (isAuthenticated && !user)) {
    return <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Checking your session"><Loader2 className="h-6 w-6 animate-spin text-brand" /><span className="sr-only">Checking your session</span></div>;
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
