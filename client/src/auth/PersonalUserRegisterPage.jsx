import { useState } from "react";
import {
  AudioLines,
  ArrowLeft,
  Zap,
  Headphones,
  Brain,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserContext } from "../context/userContext";
import api from "../utils/api";

export default function PersonalUserRegisterPage() {
  const { formState = {}, updateUserField, login } = useUserContext();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const signup = formState.signup || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fullName = `${signup.firstName} ${signup.lastName}`.trim();

      // ✅ FIX: Explicitly remove any invite code fields that might be lingering in the state
      const { uniqueInviteCode, grade, ...cleanSignup } = signup;

      const response = await api.post("/auth/register", {
        ...cleanSignup, // Only send clean data
        fullName,
        role: "personal_user",
      });

      if (response.data.success) {
        const userData =
          response.data.user ||
          response.data.data?.user ||
          response.data.data ||
          response.data;
        const token = response.data.token || response.data.data?.token || "";

        login(userData, token);
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Registration failed:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Failed to create account. Please check your details and try again.";
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen w-full bg-background">
      {/* ================= LEFT SIDE: Image & Notes ================= */}
      <div className="w-full md:w-1/2 relative bg-gradient-to-br from-brand/10 via-background to-brand/5 flex flex-col justify-center p-8 md:p-16 border-r border-border/50">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 space-y-8 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-sm font-medium">
            <Zap className="w-4 h-4" />
            <span>For Independent Learners</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground leading-tight">
            Your personal AI study companion.
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed">
            Stop struggling with dense textbooks. Turn your messy notes into
            catchy audio summaries, engaging cartoon visuals, and instant
            quizzes.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm">
              <Headphones className="w-6 h-6 text-brand mb-2" />
              <h3 className="font-semibold text-sm text-foreground">
                Audio Summaries
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Listen to your notes like a podcast.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm">
              <Brain className="w-6 h-6 text-brand mb-2" />
              <h3 className="font-semibold text-sm text-foreground">
                Smart Quizzes
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Test your knowledge instantly.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl overflow-hidden border border-border/50 shadow-xl bg-card">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop"
              alt="Student studying with laptop"
              className="w-full h-40 sm:h-64 object-cover"
            />
            <div className="p-4 bg-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Study smarter, not harder
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
                Create Personal Account
              </h2>
              <p className="text-sm text-muted-foreground">
                Get instant access to AI study tools for your independent
                learning journey.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={signup.firstName || ""}
                    onChange={(e) =>
                      updateUserField("signup", "firstName", e.target.value)
                    }
                    placeholder="John"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={signup.lastName || ""}
                    onChange={(e) =>
                      updateUserField("signup", "lastName", e.target.value)
                    }
                    placeholder="Doe"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={signup.email || ""}
                  onChange={(e) =>
                    updateUserField("signup", "email", e.target.value)
                  }
                  placeholder="john@example.com"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Current Level (Optional)
                </label>
                <select
                  value={signup.grade || ""}
                  onChange={(e) =>
                    updateUserField("signup", "grade", e.target.value)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all text-muted-foreground"
                >
                  <option value="">Select your level...</option>
                  <option value="high_school">High School</option>
                  <option value="undergraduate">University / College</option>
                  <option value="professional">
                    Professional / Self-Learner
                  </option>
                </select>
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
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating
                    Account...
                  </>
                ) : (
                  "Create Personal Account"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
