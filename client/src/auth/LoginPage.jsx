// src/pages/auth/LoginPage.jsx
import { useState } from "react";
import { AudioLines, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./authLayout"; // Kept your exact import
import { ThemeToggle } from "../components/themeToggle";
import api from "../utils/api"; // Import the API bridge we created
import { useUserContext } from "../context/userContext"; 

export default function LoginPage() {
  // ✅ 1. Get the login function from context
  const { login } = useUserContext(); 
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 2. Send request to backend
      const response = await api.post("/auth/login", { email, password });

      // 3. ✅ USE THE CONTEXT LOGIN FUNCTION (This updates localStorage AND global state instantly)
      login(response.data, response.data.token);

      // 4. Redirect based on user role
      const { role } = response.data;
      if (role === "school_admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true }); // Student or Personal user
      }
    } catch (err) {
      // Handle backend errors gracefully
      setError(
        err.response?.data?.message || "Login failed. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ... rest of your component remains exactly the same ...

  return (
    <AuthLayout>
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-6 md:p-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-brand text-brand-foreground">
              <AudioLines className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">
              Noted
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-sm px-2 sm:px-0 space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email to sign in to your account
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Error Message Display */}
              {error && (
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m@example.com"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-foreground hover:underline underline-offset-4"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
