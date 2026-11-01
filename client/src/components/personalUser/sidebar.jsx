import {
  Home,
  Library,
  Brain,
  Settings,
  LogOut,
  X,
  Music,
  Video,
  Mic,
  Clock,
  Repeat,
  Trophy,
  Sparkles,
  RotateCw,
  Bot,
  Zap,
  GraduationCap,
  MessageSquare,
  Crown,
  CalendarDays,
  Gauge
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/userContext";
import { useEffect, useState } from "react";
import api from "../../utils/api";
import useMyLimits from "../../hooks/useMyLimits";

export default function StudentSideBar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const context = useUserContext() || {};
  const { user, logout } = context;
  const { limits } = useMyLimits();
  const subscriptionExpired = user?.subscriptionEndsAt && new Date(user.subscriptionEndsAt) <= new Date();
  const isFree = !user?.subscriptionTier
    || user.subscriptionTier === "free"
    || user.subscriptionStatus !== "active"
    || subscriptionExpired;
  const isIndependentLearner = (user?.role === "personal_user" || user?.role === "student")
    && !user.schoolId
    && !user.schoolOwnerId;
  const planLabels = {
    free: "Free",
    pro: "Teacher Pro",
    premium: "Teacher Premium",
    school_owner: "School Starter",
    school_pro: "School Pro",
    school_premium: "School Premium",
  };
  const planName = user?.schoolId || user?.schoolOwnerId
    ? "School account"
    : limits?.planLabel || planLabels[limits?.plan ?? (isFree ? "free" : user?.subscriptionTier)] || "Free";
  const subscriptionEndsAt = !isFree && user?.subscriptionEndsAt
    ? new Date(user.subscriptionEndsAt)
    : null;
  const formatDate = (value) => {
    const date = value instanceof Date ? value : value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date)
      : null;
  };
  const [dueCount, setDueCount] = useState(0);
  useEffect(() => {
    const refresh = () => api.get('/revision/stats').then((r) => setDueCount(r.data?.data?.dueCount || 0)).catch(() => {});
    refresh();
    window.addEventListener('revision-updated', refresh);
    return () => window.removeEventListener('revision-updated', refresh);
  }, []);

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    }
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    { to: "/ai-teacher", label: "AI Teacher", icon: Bot },
    { to: "/aiGenerator", label: "AI Summary", icon: Sparkles },
    { to: "/podcast", label: "Podcast", icon: Mic },
    { to: "/quiz", label: "Quizzes", icon: Brain },
        { to: "/ai-flashcards", label: "AI Flashcards", icon: RotateCw },
    { to: "/revision", label: "Revision", icon: Repeat, badge: dueCount },
    { to: "/academic-progress", label: "Academic Progress", icon: GraduationCap },
    { to: "/music-studio", label: "Music Studio", icon: Music },
    { to: "/video-studio", label: "Video Studio", icon: Video },
        { to: "/myLibrary", label: "My Library", icon: Library },
    { to: "/focusTime", label: "Focus Time", icon: Clock },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/support", label: "Report an Issue", icon: MessageSquare },
    { to: "/studentSetting", label: "Settings", icon: Settings },
  ];

  // Calculate XP for the progress bar (assuming 100 XP per level)
  const currentLevel = user?.level || 1;
  const currentXP = user?.xp || 0;
  const xpProgress = currentXP % 100; 

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-border bg-background transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="font-display text-lg font-bold text-foreground">
          Noted Student
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 hover:bg-accent md:hidden"
          aria-label="Close student menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span className="flex-1">{label}</span>
            {badge > 0 && <span className="min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-[10px] font-bold text-brand-foreground">{badge > 99 ? "99+" : badge}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer / XP & Profile */}
      <div className="shrink-0 border-t border-border p-4 space-y-4">
        <section aria-label="Quick actions">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <NavLink
              to="/quiz"
              onClick={onClose}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Brain className="h-4 w-4 shrink-0 text-brand" />
              <span>Create quiz</span>
            </NavLink>
            <NavLink
              to="/aiGenerator"
              onClick={onClose}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-brand" />
              <span>Generate summary</span>
            </NavLink>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-3" aria-label="My plan">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My plan</h2>
            <span className="truncate rounded-full bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">
              {planName}
            </span>
          </div>
          {limits?.credits && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  AI credits
                </span>
                <span className="font-medium text-foreground">
                  {limits.credits.total === null
                    ? "Unlimited"
                    : `${limits.credits.remaining} / ${limits.credits.total} left`}
                </span>
              </div>
              {limits.credits.total !== null && limits.credits.total > 0 && (
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="AI credits used"
                  aria-valuemin={0}
                  aria-valuemax={limits.credits.total}
                  aria-valuenow={limits.credits.used}
                >
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.min((limits.credits.used / limits.credits.total) * 100, 100)}%` }}
                  />
                </div>
              )}
              {formatDate(limits.credits.resetsAt) && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Credits reset {formatDate(limits.credits.resetsAt)}
                </p>
              )}
            </div>
          )}
          {formatDate(subscriptionEndsAt) && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Active until {formatDate(subscriptionEndsAt)}
            </p>
          )}
          {!limits && (
            <p className="mt-2 text-[11px] text-muted-foreground">Usage details unavailable.</p>
          )}
        </section>

        {isIndependentLearner && isFree && (
          <NavLink
            to="/pricing?audience=teachers"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand/80 px-4 py-3 text-sm font-semibold text-brand-foreground shadow-md transition-all hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Crown className="h-4 w-4" />
            <span>Upgrade to Pro</span>
          </NavLink>
        )}

        {/* ✅ RESTORED: XP and Level Display */}
        <div className="rounded-xl bg-gradient-to-r from-brand/10 to-brand/5 p-3 border border-brand/20">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-brand fill-brand" />
              <span className="text-xs font-bold text-brand">Level {currentLevel}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{currentXP} XP</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-brand h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${xpProgress}%` }}
            ></div>
          </div>
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand font-bold shrink-0">
            {user?.fullName?.charAt(0).toUpperCase() || "S"}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold text-foreground truncate">
              {user?.fullName || "Student"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email || "student@noted.com"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
