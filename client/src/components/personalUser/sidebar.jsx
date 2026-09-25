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
  Trophy,
  Sparkles,
  Bot,
  Zap
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/userContext";

export default function StudentSideBar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const context = useUserContext() || {};
  const { user, logout } = context;

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    }
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    { to: "/myLibrary", label: "My Library", icon: Library },
    { to: "/ai-teacher", label: "AI Teacher", icon: Bot },
    { to: "/aiGenerator", label: "AI Summary", icon: Sparkles },
    { to: "/quiz", label: "Quizzes", icon: Brain },
    { to: "/music-studio", label: "Music Studio", icon: Music },
    { to: "/video-studio", label: "Video Studio", icon: Video },
    { to: "/podcast", label: "Podcast", icon: Mic },
    { to: "/focusTime", label: "Focus Time", icon: Clock },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
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
        {navItems.map(({ to, label, icon: Icon }) => (
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
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / XP & Profile */}
      <div className="shrink-0 border-t border-border p-4 space-y-4">
        
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
