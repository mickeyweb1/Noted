import { AudioLines } from "lucide-react";
import { ThemeToggle } from "../../../../components/ThemeToggle";
import { useUserContext } from "../../../../userContext";
import {NavLink} from "react-router-dom"

export default function YourLoginForm() {
  const { user, setPage, updateUserField } = useUserContext();
  const { page } = user;

  const showSignIn = page === "signin";
  const showSignUp = page === "signup";
  const showForgot = page === "forgot";

  return (
    <>
      <div
        className="w-full md:w-1/2 flex flex-col min-h-screen bg-background"
        style={showSignIn ? { display: "flex" } : { display: "none" }}
      >
        {/* Top Header: Logo & Theme Toggle */}
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

        {/* Main Content Area: Centered vertically and horizontally */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-sm space-y-6">
            {/* ================= LOGIN UI ================= */}
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
                  Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email to sign in to your account
                </p>
              </div>

              <div className="space-y-4">
                {/* Email Input */}
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium leading-none text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user.signin.email}
                    onChange={(e) =>
                      updateUserField("signin", "email", e.target.value)
                    }
                    placeholder="m@example.com"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium leading-none text-foreground">
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                      onClick={() => setPage("forgot")}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={user.signin.password}
                    onChange={(e) =>
                      updateUserField("signin", "password", e.target.value)
                    }
                    placeholder="••••••••"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                {/* Submit Button */}
                <NavLink
                  to="/dashboard"
                className="w-full inline-flex items-center justify-center h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                  Sign In
                </NavLink >
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border"></span>
                </div>
                <span className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </span>
              </div>

              {/* Footer Link */}
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{""}
                <button
                  type="button"
                  className="font-medium text-foreground hover:underline underline-offset-4"
                  onClick={() => setPage("signup")}
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 
                      ================= SIGN UP UI =================
                      (You can swap this in when you need it)
                      Just change the heading to "Create an account", 
                      add a "Confirm Password" input, and change the footer link to "Already have an account? Sign in".
                    */}

      <div
        className="w-full md:w-1/2 flex flex-col min-h-screen bg-background"
        style={showSignUp ? { display: "flex" } : { display: "none" }}
      >
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

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Create an account
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your details to get started
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Name Input */}
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium leading-none text-foreground">
                  First Name
                </label>
                <input
                  type="text"
                  value={user.signup.firstName}
                  onChange={(e) =>
                    updateUserField("signup", "firstName", e.target.value)
                  }
                  placeholder="John Doe"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium leading-none text-foreground">
                  Last Name
                </label>
                <input
                  type="text"
                  value={user.signup.lastName}
                  onChange={(e) =>
                    updateUserField("signup", "lastName", e.target.value)
                  }
                  placeholder="John Doe"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium leading-none text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={user.signup.email}
                  onChange={(e) =>
                    updateUserField("signup", "email", e.target.value)
                  }
                  placeholder="m@example.com"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium leading-none text-foreground">
                  Password
                </label>
                <input
                  type="password"
                  value={user.signup.password}
                  onChange={(e) =>
                    updateUserField("signup", "password", e.target.value)
                  }
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium leading-none text-foreground">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={user.signup.confirmPassword}
                  onChange={(e) =>
                    updateUserField("signup", "confirmPassword", e.target.value)
                  }
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Submit Button */}
              <NavLink 
                to="/dashboard"
              className="w-full inline-flex items-center justify-center h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                Create Account
              </NavLink>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <span className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </span>
            </div>

            {/* Social Button */}

            {/* Footer Link */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-foreground hover:underline underline-offset-4"
                onClick={() => setPage("signin")}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* 
                      ================= FORGOT PASSWORD UI =================
                      (You can swap this in when you need it)
                      Just change the heading to "Forgot password", 
                      remove the password input, and add a "Back to login" link.
                    */}

      <div
        className="w-full md:w-1/2 flex flex-col min-h-screen bg-background"
        style={showForgot ? { display: "flex" } : { display: "none" }}
      >
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

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Forgot password
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>
            </div>

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium leading-none text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={user.forgot.email}
                  onChange={(e) =>
                    updateUserField("forgot", "email", e.target.value)
                  }
                  placeholder="m@example.com"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Submit Button */}
              <button className="w-full inline-flex items-center justify-center h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                Send Reset Link
              </button>
            </div>

            {/* Footer Link (No social login needed for forgot password) */}
            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                className="font-medium text-foreground hover:underline underline-offset-4"
                onClick={() => setPage("signin")}
              >
                ← Back to login
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
