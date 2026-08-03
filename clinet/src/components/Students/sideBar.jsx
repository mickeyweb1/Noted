import {
  AudioLines,
  BookOpen,
  LayoutDashboard,
  Library,
  Settings,
  Stars,
  Timer,
  User,
  LogOut,
  Calendar
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserContext } from "../../userContext"; // Using the AuthContext we built earlier

export default function StudentSideBar({ isOpen, onClose }) {
  const { user, logout } = useUserContext(); // Get user and logout function
  const navigate = useNavigate();

  const userData = user || {
    fullName: "Guest Student",
    email: "guest@noted.com",
    avatar: null,
  };
  const userAvatar = userData.avatar ?? null;

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/aiGenerator", icon: Stars, label: "AI Generator" },
    { to: "/myLibrary", icon: Library, label: "My Library" },
    { to: "/quiz", icon: BookOpen, label: "Quiz" },
    { to: "/focusTime", icon: Timer, label: "Focus Time" },
    { to: "/studentSetting", icon: Settings, label: "Settings" },
    {to: "/reminder", icon: Calendar, label: "Schedule" }
  ];

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    }
    navigate("/login");
  };

  return (
    <aside
      className={`
            fixed md:relative z-50 flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border 
            transition-transform duration-300 ease-in-out
            ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
    >
      {/* 1. LOGO & BRANDING */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-brand-foreground shadow-sm">
          <AudioLines className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg text-sidebar-foreground leading-none">
            Noted
          </span>
          <p className="text-xs text-sidebar-foreground/60 mt-1">
            study.but louder
          </p>
        </div>
      </div>

      {/* 2. NAVIGATION MENU */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
          Menu
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose} // Close sidebar on mobile when a link is clicked
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
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-sidebar-accent text-sidebar-accent-foreground overflow-hidden shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              {userData.firstName} {userData.lastName}
            </span>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {userData.email}
            </p>
          </div>
        </div>

        {/* Logout Button */}
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
