import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  Settings,
  LogOut,
  AudioLines,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useUserContext } from "../../context/userContext";

export default function AdminSideBar({ isOpen, onClose }) {
  const { user, logout } = useUserContext();

  const userData = user || {
    fullName: "Admin",
    firstName: "Admin",
    email: "admin@noted.com",
    role: "school_admin",
    avatar: null,
  };

  const navItems = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/students", icon: Users, label: "Manage Students" },
    { to: "/admin/add-student", icon: UserPlus, label: "Add Student" },
    { to: "/admin/billing", icon: CreditCard, label: "Billing" },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    }
    window.location.replace("/login");
  };

  return (
    <aside
      className={`
        fixed md:static inset-y-0 left-0 z-50 flex flex-col h-full w-64 bg-card border-r border-border 
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
    >
      {/* 1. LOGO & BRANDING */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-brand-foreground shadow-sm">
          <AudioLines className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg text-foreground leading-none">
            Noted Admin
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            school.management
          </p>
        </div>
      </div>

      {/* 2. NAVIGATION MENU */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Management
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-brand text-brand-foreground shadow-md shadow-brand/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? "text-brand-foreground" : "text-muted-foreground"
                  }`}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 3. USER PROFILE FOOTER */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand/10 text-brand overflow-hidden shrink-0">
            {userData.avatar ? (
              <img
                src={userData.avatar}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-bold text-sm">
                {(userData.firstName || userData.fullName || "A")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {userData.firstName || userData.fullName}
            </span>
            <p className="text-xs text-muted-foreground truncate">
              {userData.email}
            </p>
            <p className="text-[10px] text-brand font-bold uppercase mt-0.5">
              School Admin
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 bg-red-500/10 hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
