import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Brain, Trophy, BarChart3, GraduationCap, UserPlus, Share2,
  MessageSquare, Settings, Crown, LogOut, X,
} from "lucide-react";
import { useUserContext } from "../../context/userContext";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// The four main tabs. "More" is the fifth. Change a label or icon here to rename a tab.
// `match` lists the paths that should light the tab up (a path also matches anything below it).
const PRIMARY = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard, match: ["/admin/dashboard"] },
  { to: "/admin/quizzes", label: "Test", icon: Brain, match: ["/admin/quizzes"] },
  { to: "/admin/game-show-creator", label: "Game Show", icon: Trophy, match: ["/admin/game-show-creator", "/game-show"] },
  { to: "/admin/quiz-results", label: "Results", icon: BarChart3, match: ["/admin/quiz-results", "/admin/quiz/"] },
];

const matches = (pathname, paths) =>
  paths.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));

const tabClass = (active) =>
  `flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition active:scale-95 ${focusRing} ${
    active ? "bg-gradient-to-br from-brand to-brand/80 text-brand-foreground shadow-md" : "text-foreground"
  }`;

export default function AdminBottomNav() {
  const { user, logout } = useUserContext();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const role = user?.role;
  const isOwner = role === "school_admin" || role === "super_admin";
  const canManageTeachers = isOwner || role === "hod";
  const isSchoolAdmin = role === "school_admin";
  const isIndependentTeacher = role === "teacher" && !user?.schoolOwnerId;

  const isFree =
    !user?.subscriptionTier ||
    user.subscriptionTier === "free" ||
    user.subscriptionStatus !== "active" ||
    Boolean(user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) <= new Date());
  const showUpgrade =
    (isSchoolAdmin && (user?.subscriptionTier !== "school_premium" || isFree)) || (isIndependentTeacher && isFree);

  // Everything that is not one of the four main tabs lives under "More".
  const moreItems = [
    ...(role === "super_admin" ? [{ to: "/admin/manage-plans", label: "Subscriptions", icon: Crown }] : []),
    ...(canManageTeachers
      ? [
          { to: "/admin/teachers", label: "My Teachers", icon: GraduationCap },
          { to: "/admin/add-teacher", label: "Add Teacher", icon: UserPlus },
        ]
      : []),
    { to: "/admin/join-shared-quiz", label: "Join Shared", icon: Share2 },
    { to: "/admin/support", label: "Report Issue", icon: MessageSquare },
    ...(role === "super_admin" ? [{ to: "/admin/support-inbox", label: "Support Inbox", icon: MessageSquare }] : []),
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const moreActive = moreItems.some((item) => matches(pathname, [item.to]));
  const primaryActive = PRIMARY.some((item) => matches(pathname, item.match));

  // Close the sheet whenever the page changes, and on Escape.
  useEffect(() => { setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setMoreOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  // A live Game Show needs the whole screen.
  if (pathname === "/game-show") return null;

  const userName = user?.fullName || "Admin";

  return (
    <>
      <nav
        aria-label="Admin navigation"
        className="fixed inset-x-3 z-30 md:hidden"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-stretch gap-1 rounded-2xl border border-foreground/70 bg-background/95 p-1.5 shadow-lg backdrop-blur">
          {PRIMARY.map(({ to, label, icon: Icon, match }) => {
            const active = matches(pathname, match);
            return (
              <Link key={to} to={to} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                <Icon className={`h-5 w-5 ${active ? "" : "text-muted-foreground"}`} />
                <span>{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={tabClass(moreOpen || (moreActive && !primaryActive))}
          >
            <span aria-hidden="true" className={`text-xl font-bold leading-5 ${moreOpen || (moreActive && !primaryActive) ? "" : "text-muted-foreground"}`}>
              ···
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="More options">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className={`rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground ${focusRing}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(({ to, label, icon: Icon }) => {
                const active = matches(pathname, [to]);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-xs font-semibold transition active:scale-95 ${focusRing} ${
                      active ? "border-brand bg-brand-soft text-brand" : "border-border bg-background text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>

            {showUpgrade && (
              <Link
                to={`/pricing?audience=${isSchoolAdmin ? "schools" : "teachers"}`}
                onClick={() => setMoreOpen(false)}
                className={`mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand/80 px-4 py-3 text-sm font-semibold text-brand-foreground shadow-md ${focusRing}`}
              >
                <Crown className="h-4 w-4" /> {isSchoolAdmin ? "Upgrade School Plan" : "Upgrade to Pro"}
              </Link>
            )}

            <button
              type="button"
              onClick={() => logout?.()}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10 ${focusRing}`}
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
