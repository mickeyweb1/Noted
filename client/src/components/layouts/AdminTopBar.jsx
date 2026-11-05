import { useRef, useEffect } from "react";
import { Search, Sun, Moon, Crown } from "lucide-react";
import { useLocation, NavLink } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { useUserContext } from "../../context/userContext";

const pageTitles = {
  "/admin/dashboard": "Dashboard",
  "/admin/students": "Manage Students",
  "/admin/add-student": "Add Student",
  "/admin/billing": "Billing",
  "/admin/settings": "Settings",
  "/admin/quizzes": "Formal Test",
  "/admin/game-show-creator": "Game Show Creator",
  "/admin/quiz-results": "Quiz Results",
  "/admin/teachers": "My Teachers",
  "/admin/add-teacher": "Add Teacher",
  "/admin/join-shared-quiz": "Join Shared Quiz",
  "/admin/manage-plans": "Manage Subscriptions",
  "/admin/support": "Report an Issue",
  "/admin/support-inbox": "Support Inbox",
};

export default function AdminTopBar() {
  const searchInputRef = useRef(null);
  const { pathname } = useLocation();
  const { user } = useUserContext();
  const { theme, toggleTheme } = useTheme();

  const pageTitle = pageTitles[pathname] || "Admin Dashboard";
  const subscriptionExpired =
    user?.subscriptionEndsAt &&
    new Date(user.subscriptionEndsAt) <= new Date();
  const isFree =
    !user?.subscriptionTier ||
    user.subscriptionTier === "free" ||
    user.subscriptionStatus !== "active" ||
    subscriptionExpired;
  const isSchoolAdmin = user?.role === "school_admin";
  const isIndependentTeacher =
    user?.role === "teacher" && !user?.schoolOwnerId;
  const showUpgrade =
    (isSchoolAdmin && (user?.subscriptionTier !== "school_premium" || isFree)) ||
    (isIndependentTeacher && isFree);
  const pricingAudience = isSchoolAdmin ? "schools" : "teachers";

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 flex-col">
        <h2 className="truncate font-display text-lg font-semibold text-foreground">
          {pageTitle}
        </h2>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Manage your school from one place.
        </p>
      </div>

      <div className="flex-1" />

      <div className="relative hidden w-full max-w-xs items-center sm:flex">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search students, settings..."
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <kbd className="pointer-events-none absolute right-3 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {showUpgrade && (
          <NavLink
            to={`/pricing?audience=${pricingAudience}`}
            className="hidden items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand/90 md:inline-flex"
          >
            <Crown className="h-4 w-4" />
            Upgrade
          </NavLink>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
