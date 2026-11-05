import {
  LayoutDashboard,
  Settings,
  LogOut,
  Brain,
  Building2,
  BarChart3,
  UserPlus,
  MessageSquare,
  Trophy,
  Share2,
  GraduationCap,
  Crown,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/userContext";

export default function AdminSideBar() {
  const { user, logout } = useUserContext();
  const navigate = useNavigate();

  const userRole = user?.role;
  const userData = user || {
    fullName: "Admin",
    email: "admin@noted.com",
    avatar: null,
  };

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

  const navItems = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Overview" },
    ...(userRole === "super_admin"
      ? [
          {
            to: "/admin/manage-plans",
            icon: Crown,
            label: "Manage Subscriptions",
          },
        ]
      : []),
    { to: "/admin/join-shared-quiz", icon: Share2, label: "Join Shared Quiz" },
    ...(canManageTeachers
      ? [
          { to: "/admin/teachers", icon: GraduationCap, label: "My Teachers" },
          { to: "/admin/add-teacher", icon: UserPlus, label: "Add Teacher" },
        ]
      : []),
    { to: "/admin/quizzes", icon: Brain, label: "Formal Test" },
    {
      to: "/admin/game-show-creator",
      icon: Trophy,
      label: "Game Show Creator",
    },
    { to: "/admin/quiz-results", icon: BarChart3, label: "My Results" },
    { to: "/admin/support", icon: MessageSquare, label: "Report an Issue" },
    ...(userRole === "super_admin"
      ? [
          {
            to: "/admin/support-inbox",
            icon: MessageSquare,
            label: "Support Inbox",
          },
        ]
      : []),
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = () => {
    if (typeof logout === "function") logout();
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex md:relative md:z-20 md:h-full md:w-64 md:shrink-0 md:flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Logo and branding */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-6 dark:border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="font-display text-lg font-bold leading-none text-gray-900 dark:text-white">
            Noted Admin
          </span>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Manage your school
          </p>
        </div>
      </div>

      {/* Desktop navigation */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-6">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Management
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Upgrade banner */}
      {showUpgrade && (
        <div className="px-4 pb-2">
          <NavLink
            to={`/pricing?audience=${pricingAudience}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand/80 px-4 py-3 text-sm font-semibold text-brand-foreground shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <Crown className="h-4 w-4" />
            <span>{isSchoolAdmin ? "Upgrade School Plan" : "Upgrade to Pro"}</span>
          </NavLink>
        </div>
      )}

      {/* User profile and logout */}
      <div className="shrink-0 space-y-2 border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/10 text-brand">
            {userData.avatar ? (
              <img
                src={userData.avatar}
                alt="Profile"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold">
                {(userData.fullName || "A").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {userData.fullName}
            </span>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {userData.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-5 w-5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
