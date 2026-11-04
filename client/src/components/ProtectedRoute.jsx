import { Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "../context/userContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isAuthLoading, user } = useUserContext();
  const location = useLocation();

  // 1. Show loading spinner while checking auth
  if (isAuthLoading || (isAuthenticated && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Checking your session">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  // 2. If not logged in, send to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If logged in but role is not allowed, redirect to their correct dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // ✅ Include 'hod' and 'teacher' in admin roles so they go to /admin/dashboard
    const adminRoles = ["school_admin", "super_admin", "teacher", "hod"];
    const destination = adminRoles.includes(user.role) ? "/admin/dashboard" : "/dashboard";
    
    // ✅ Always use Navigate to redirect, NEVER return null
    return <Navigate to={destination} replace />;
  }

  // 4. If everything is good, render the page
  return children;
}
