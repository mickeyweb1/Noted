import { useState } from "react";
import { AudioLines, ArrowRight, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./authLayout";
import { ThemeToggle } from "../components/themeToggle";
import api from "../utils/api";
import { useUserContext } from "../context/userContext";

// text-base (16px) on inputs stops iPhone Safari from zooming in when a field is tapped
const inputCls =
  "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export default function LoginPage() {
  const { login } = useUserContext();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const checkCapsLock = (e) => setCapsLockOn(Boolean(e.getModifierState?.("CapsLock")));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      // 1. Send request to backend
      const response = await api.post("/auth/login", { email: email.trim(), password });

      // 2. Backend sends the user fields flat at the top level
      const responseData = response.data;

      // 3. Clean the role field (remove escaped quotes just in case)
      const userData = {
        _id: responseData._id,
        fullName: responseData.fullName,
        email: responseData.email,
        role: responseData.role?.replace(/"/g, "") || responseData.role,
        level: responseData.level,
        xp: responseData.xp,
        schoolId: responseData.schoolId,
        schoolName: responseData.schoolName,
      };

      const authToken = responseData.token;

      // 4. Safety check
      if (!authToken || !userData?.role) {
        console.error("Login response missing token or role:", response.data);
        throw new Error("Login response did not include a token and user role.");
      }

      // 5. Save the session in context
      login(userData, authToken);

      // 6. Smart redirect
      if (userData.role === "school_admin" || userData.role === "super_admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request && !err.response
            ? "Can't reach the server. Check your internet connection and try again."
            : "Login failed. Please check your credentials.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 sm:p-7 md:p-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-soft">
              <AudioLines className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Noted</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Login Form */}
        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8 md:pb-14">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="mb-7 space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Your learning space</p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-sm leading-6 text-muted-foreground">Enter your email to sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5" noValidate={false}>
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-left text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                  placeholder="m@example.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  disabled={isLoading}
                  className={inputCls}
                />
              </div>

              {/* Password with show / hide button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-brand underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                    onKeyDown={checkCapsLock}
                    onKeyUp={checkCapsLock}
                    onBlur={() => setCapsLockOn(false)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    onMouseDown={(e) => e.preventDefault()} // keeps the cursor in the password box on desktop
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {capsLockOn && (
                  <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Caps Lock is on
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-foreground shadow-soft transition hover:bg-brand/90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-foreground/30 border-t-brand-foreground" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
