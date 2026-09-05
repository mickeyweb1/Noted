import { useState } from "react";
import {
  AudioLines,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserContext } from "../context/userContext";
import api from "../utils/api"; // Adjust path if needed

export default function SchoolAdminRegisterPage() {
  const { formState = {}, updateUserField, login } = useUserContext();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const signup = formState.signup || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // ✅ FIX: Combine firstName and lastName into fullName for the backend
      const fullName = `${signup.firstName} ${signup.lastName}`.trim();

      const response = await api.post("/auth/register", {
        ...signup,
        fullName,
        role: "school_admin", // Force the role
      });

      if (response.data.success) {
        const { user, token } = response.data;
        login(user, token);
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Registration failed:", error);
      alert(
        error.response?.data?.message ||
          "Failed to register school. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen w-full bg-background">
      {/* ================= LEFT SIDE: Image & Notes ================= */}
      <div className="w-full md:w-1/2 relative bg-gradient-to-br from-brand/10 via-background to-brand/5 flex flex-col justify-center p-8 md:p-16 border-r border-border/50">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 space-y-8 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-sm font-medium">
            <Building2 className="w-4 h-4" />
            <span>For Educational Institutions</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground leading-tight">
            Empower your entire school with AI.
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed">
            "Noted" isn't just a study tool; it's a complete learning ecosystem.
            Manage admissions, track student progress, and give your students
            the ultimate AI-powered study advantage.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/80">
                Centralized dashboard for all student data and records.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/80">
                Generate unique, one-time invite codes for new enrollments.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl overflow-hidden border border-border/50 shadow-xl bg-card">
            <img
              src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1000&auto=format&fit=crop"
              alt="School administration dashboard"
              className="w-full h-40 sm:h-64 object-cover" 
            />
            <div className="p-4 bg-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Trusted by forward-thinking schools
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE: Registration Form ================= */}
      <div className="w-full md:w-1/2 flex flex-col min-h-screen bg-background p-6 md:p-12 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/signup"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to role selection
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-brand text-brand-foreground">
              <AudioLines className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">
              Noted
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Register Your School
              </h2>
              <p className="text-sm text-muted-foreground">
                Set up your institution's portal to manage students and track
                progress.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Admin First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={signup.firstName || ""}
                    onChange={(e) =>
                      updateUserField("signup", "firstName", e.target.value)
                    }
                    placeholder="Jane"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Admin Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={signup.lastName || ""}
                    onChange={(e) =>
                      updateUserField("signup", "lastName", e.target.value)
                    }
                    placeholder="Smith"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Official School Email
                </label>
                <input
                  type="email"
                  required
                  value={signup.email || ""}
                  onChange={(e) =>
                    updateUserField("signup", "email", e.target.value)
                  }
                  placeholder="admin@school.edu"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={signup.schoolName || ""}
                  onChange={(e) =>
                    updateUserField("signup", "schoolName", e.target.value)
                  }
                  placeholder="e.g., Springfield High School"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Create Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={signup.password || ""}
                  onChange={(e) =>
                    updateUserField("signup", "password", e.target.value)
                  }
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-brand text-brand-foreground font-medium text-sm hover:bg-brand/90 transition-colors mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Registering
                    School...
                  </>
                ) : (
                  "Register School & Create Account"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
