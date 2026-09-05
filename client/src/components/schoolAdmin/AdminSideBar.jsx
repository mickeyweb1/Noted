import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  Settings,
  LogOut,
  AudioLines,
  Building2,
  UserPlus,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/userContext";

export default function AdminSideBar({ isOpen, onClose }) {
  const { user, logout } = useUserContext();
  const navigate = useNavigate();

  const userData = user || {
    fullName: "Admin",
    email: "admin@noted.com",
    avatar: null,
  };

  const navItems = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Overview" },
    { to: "/admin/admissions", icon: UserCheck, label: "Admissions" }, 
    { to: "/admin/students", icon: Users, label: "My Students" },
    { to: "/admin/add-student", icon: UserPlus, label: "Add Student" },
    // { to: "/admin/students", icon: Users, label: "Student Directory" }, // ✅ REMOVED DUPLICATE
    { to: "/admin/billing", icon: CreditCard, label: "Billing & Plans" },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = () => {
    if (typeof logout === "function") logout();
    navigate("/login");
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out md:relative md:inset-y-auto md:left-auto md:h-full ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
    >
      {/* 1. LOGO & BRANDING */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-brand-foreground shadow-sm">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg text-sidebar-foreground leading-none">
            Noted Admin
          </span>
          <p className="text-xs text-sidebar-foreground/60 mt-1">
            Manage your school
          </p>
        </div>
      </div>

      {/* 2. NAVIGATION MENU */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
          Management
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 3. USER PROFILE FOOTER */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-sidebar-accent text-sidebar-accent-foreground shrink-0">
{userData.avatar ? (
  <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
) : (
  // ✅ Shows the first letter of their name (e.g., "A" for Admin)
  <span className="font-bold text-sm">
    {(userData.fullName || "A").charAt(0).toUpperCase()}
  </span>
)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              {userData.fullName}
            </span>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {userData.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
