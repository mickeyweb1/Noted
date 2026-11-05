import { useState, useEffect } from "react"; // ✅ ADD useEffect
import {
  LayoutDashboard, Users, CreditCard, Settings, LogOut, Brain, Building2,
  BarChart3, UserPlus, X, MessageSquare, Trophy, Share2, GraduationCap, Crown
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/userContext";

export default function AdminSideBar({ isOpen, onClose }) {
  const { user, logout } = useUserContext();
  const navigate = useNavigate();

  // ✅ SAFELY extract role to prevent crashes if user is still loading
  const userRole = user?.role;
  const userData = user || { fullName: "Admin", email: "admin@noted.com", avatar: null };

  const isOwner = userRole === "school_admin" || userRole === "super_admin";
  const canManageTeachers = isOwner || userRole === "hod"; // ✅ HOD can manage teachers
  
  const isSchoolAdmin = userRole === "school_admin";
  const isIndependentTeacher = userRole === "teacher" && !user?.schoolOwnerId;

  // ✅ FIX: Move date calculation into a state to prevent hydration mismatch
  const [isFree, setIsFree] = useState(true);
  
  useEffect(() => {
    if (user) {
      const subscriptionExpired = user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) <= new Date();
      const freeStatus = !user.subscriptionTier || user.subscriptionTier === "free" || user.subscriptionStatus !== "active" || subscriptionExpired;
      setIsFree(freeStatus);
    }
  }, [user]); // Only recalculate when the user object changes

  const showUpgrade = (isSchoolAdmin && (user?.subscriptionTier !== "school_premium" || isFree)) || (isIndependentTeacher && isFree);
  const pricingAudience = isSchoolAdmin ? "schools" : "teachers";

  const navItems = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Overview" }, 
     ...(userRole === "super_admin" ? [{ to: "/admin/manage-plans", icon: Crown, label: "Manage Subscriptions" }] : []),
    { to: "/admin/join-shared-quiz", icon: Share2, label: "Join Shared Quiz" },
    // ✅ Show these links to Owners AND HODs
    ...(canManageTeachers ? [
      { to: "/admin/teachers", icon: GraduationCap, label: "My Teachers" },
      { to: "/admin/add-teacher", icon: UserPlus, label: "Add Teacher" },
    ] : []),
    { to: "/admin/quizzes", icon: Brain, label: "Formal Test" }, 
    { to: "/admin/game-show-creator", icon: Trophy, label: "Game Show Creator" }, 
    { to: "/admin/quiz-results", icon: BarChart3, label: "My Results" },
    { to: "/admin/support", icon: MessageSquare, label: "Report an Issue" },
    ...(userRole === "super_admin" ? [{ to: "/admin/support-inbox", icon: MessageSquare, label: "Support Inbox" }] : []),
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = () => {
    if (typeof logout === "function") logout();
    navigate("/login");
  };


  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      {/* 1. LOGO & BRANDING */}
      <div className="flex items-center justify-between gap-3 px-6 h-16 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-white shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg text-gray-900 dark:text-white leading-none">Noted Admin</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage your school</p>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* 2. NAVIGATION MENU */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 min-h-0">
        <p className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Management</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-brand/10 text-brand" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 3. UPGRADE BANNER */}
      {showUpgrade && (
        <div className="px-4 pb-2">
          <NavLink to={`/pricing?audience=${pricingAudience}`} onClick={onClose} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand/80 px-4 py-3 text-sm font-semibold text-brand-foreground shadow-md transition-all hover:scale-[1.02] hover:shadow-lg">
            <Crown className="w-4 h-4" />
            <span>{isSchoolAdmin ? "Upgrade School Plan" : "Upgrade to Pro"}</span>
          </NavLink>
        </div>
      )}

      {/* 4. USER PROFILE FOOTER */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand/10 text-brand shrink-0">
            {userData.avatar ? (
              <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="font-bold text-sm">{(userData.fullName || "A").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userData.fullName}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userData.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
