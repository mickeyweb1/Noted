import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  MoreHorizontal,
  Share2,
  GraduationCap,
  UserPlus,
  BarChart3,
  MessageSquare,
  Settings,
  Crown,
  LogOut,
  X,
  Trophy,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/userContext";

export default function AdminBottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { user, logout } = useUserContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const userRole = user?.role;
  const isOwner = userRole === "school_admin" || userRole === "super_admin";
  const canManageTeachers = isOwner || userRole === "hod";
  const isSchoolAdmin = userRole === "school_admin";
  const isIndependentTeacher = userRole === "teacher" && !user?.schoolOwnerId;

  const isFree =
    !user?.subscriptionTier ||
    user.subscriptionTier === "free" ||
    user.subscriptionStatus !== "active" ||
    Boolean(
      user.subscriptionEndsAt &&
        new Date(user.subscriptionEndsAt) <= new Date()
    );

  const showUpgrade =
    (isSchoolAdmin && (user?.subscriptionTier !== "school_premium" || isFree)) ||
    (isIndependentTeacher && isFree);
  const pricingAudience = isSchoolAdmin ? "schools" : "teachers";

  const isOverviewActive = pathname === "/admin/dashboard";
  const isTestActive = pathname.startsWith("/admin/quizzes");
  const isQuizActive = pathname.startsWith("/admin/game-show-creator");
  const isMoreActive = !isOverviewActive && !isTestActive && !isQuizActive;

  const moreItems = [
    { to: "/admin/join-shared-quiz", icon: Share2, label: "Join Shared Quiz" },
    ...(canManageTeachers
      ? [
          { to: "/admin/teachers", icon: GraduationCap, label: "My Teachers" },
          { to: "/admin/add-teacher", icon: UserPlus, label: "Add Teacher" },
        ]
      : []),
    { to: "/admin/quiz-results", icon: BarChart3, label: "My Results" },
    { to: "/admin/support", icon: MessageSquare, label: "Report an Issue" },
    ...(userRole === "super_admin"
      ? [
          {
            to: "/admin/manage-plans",
            icon: Crown,
            label: "Manage Subscriptions",
          },
          {
            to: "/admin/support-inbox",
            icon: MessageSquare,
            label: "Support Inbox",
          },
        ]
      : []),
    { to: "/admin/settings", icon: Settings, label: "Settings" },
    ...(showUpgrade
      ? [
          {
            to: `/pricing?audience=${pricingAudience}`,
            icon: Crown,
            label: isSchoolAdmin ? "Upgrade School Plan" : "Upgrade to Pro",
          },
        ]
      : []),
  ];

  const handleLogout = () => {
    setIsMoreOpen(false);
    if (typeof logout === "function") logout();
    navigate("/login");
  };

  const closeMore = () => setIsMoreOpen(false);

  const mainTabs = [
    {
      to: "/admin/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      active: isOverviewActive,
    },
    {
      to: "/admin/quizzes",
      label: "Test",
      icon: ClipboardList,
      active: isTestActive,
    },
    {
      to: "/admin/game-show-creator",
      label: "Quiz",
      icon: Trophy,
      active: isQuizActive,
    },
  ];

  return (
    <>
      {/* Mobile More menu. It opens above the bottom navigation. */}
      {isMoreOpen && (
        <button
          type="button"
          aria-label="Close More menu"
          onClick={closeMore}
          className="fixed inset-0 z-40 bg-black/25 md:hidden"
        />
      )}

      <nav
        aria-label="Mobile admin navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-2 pt-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.07)] backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/95 md:hidden"
      >
        {isMoreOpen && (
          <div className="absolute bottom-full left-3 right-3 z-50 mb-2 max-h-[65vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 px-2 pb-3 dark:border-gray-800">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  More options
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {user?.fullName || user?.email || "Admin account"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMore}
                aria-label="Close More options"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMore}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand/10 text-brand"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1">
          {mainTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              onClick={closeMore}
              className={({ isActive }) =>
                `flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition-colors ${
                  isActive || tab.active
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`
              }
            >
              <tab.icon className="h-5 w-5" strokeWidth={2.1} />
              <span className="text-[11px] font-semibold leading-tight">
                {tab.label}
              </span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setIsMoreOpen((open) => !open)}
            aria-expanded={isMoreOpen}
            aria-label="More navigation options"
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition-colors ${
              isMoreOpen || isMoreActive
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {isMoreOpen ? (
              <X className="h-5 w-5" strokeWidth={2.1} />
            ) : (
              <MoreHorizontal className="h-5 w-5" strokeWidth={2.1} />
            )}
            <span className="text-[11px] font-semibold leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
