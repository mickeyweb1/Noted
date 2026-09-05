import {
  AudioLines, BookOpen, LayoutDashboard, Library, Settings,
  Stars, Timer, User, Users, LogOut, Calendar, GraduationCap, Trophy,
  Flame, Zap, Loader2
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/userContext"; 
import { useState, useEffect } from "react";
import api from "../../utils/api";

export default function StudentSideBar({ isOpen, onClose }) {
  const { user, logout } = useUserContext(); 
  const navigate = useNavigate();

  // ✅ NEW: State to hold LIVE stats from the database
  const [liveStats, setLiveStats] = useState({ xp: 0, level: 1, streak: 0 });

  // ✅ NEW: Fetch fresh stats whenever the sidebar opens or user changes
  useEffect(() => {
    const fetchFreshStats = async () => {
      try {
        const res = await api.get("/auth/me");
        if (res.data.success) {
          const u = res.data.data;
          setLiveStats({
            xp: u.xp || 0,
            level: u.level || 1,
            streak: u.streak || 0 // If your backend tracks streaks
          });
        }
      } catch (error) {
        console.error("Failed to fetch fresh stats", error);
      }
    };
    fetchFreshStats();
  }, [user?._id]); // Re-fetch if the user changes

  const userData = user || {
    fullName: "Guest Student",
    firstName: "Guest",
    email: "guest@noted.com",
    role: "student",
    avatar: null,
  };

  // ✅ Use liveStats instead of userData for XP/Level
  const currentLevel = liveStats.level;
  const totalXp = liveStats.xp;
  const xpInCurrentLevel = totalXp % 100; 
  const xpNeededForNextLevel = 100;
  const progressPercentage = (xpInCurrentLevel / xpNeededForNextLevel) * 100;
  const streak = liveStats.streak;

  const allNavItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/aiGenerator", icon: Stars, label: "AI Generator" },
    { to: "/myLibrary", icon: Library, label: "My Library" },
    { to: "/quiz", icon: BookOpen, label: "Quiz Mode" },
    { to: "/focusTime", icon: Timer, label: "Focus Time" },
    { to: "/ai-teacher", icon: GraduationCap, label: "AI Tutor" },
    { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { to: "/directory", icon: Users, label: "Student Directory" }, 
    { to: "/profile", icon: User, label: "My Profile" },
    { to: "/reminder", icon: Calendar, label: "Schedule" },
    { to: "/studentSetting", icon: Settings, label: "Settings" },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.to === "/directory" && user?.role === "personal_user") return false;
    return true;
  });

  const handleLogout = () => {
    if (typeof logout === "function") logout(); 
    window.location.replace("/login"); 
  };

  return (
    <aside className={`
      fixed md:static inset-y-0 left-0 z-50 flex flex-col h-full w-64 bg-card border-r border-border 
      transition-transform duration-300 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
    `}>
      {/* 1. LOGO & BRANDING */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-brand-foreground shadow-sm">
          <AudioLines className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg text-foreground leading-none">Noted</span>
          <p className="text-xs text-muted-foreground mt-0.5">study.but louder</p>
        </div>
      </div>

      {/* 2. NAVIGATION MENU */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Menu</p>
        
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
                <item.icon className={`w-5 h-5 ${isActive ? "text-brand-foreground" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 3. GAMIFICATION STATS (Now uses LIVE data) */}
      <div className="px-4 py-4 border-t border-border bg-muted/30 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${streak > 0 ? "text-orange-500 animate-pulse" : "text-muted-foreground"}`} />
            <span className="text-sm font-semibold text-foreground">{streak} Day Streak</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-md border border-border">
            Lvl {currentLevel}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-brand" /> {totalXp} XP
            </span>
            <span className="text-muted-foreground">{xpInCurrentLevel} / {xpNeededForNextLevel} XP</span>
          </div>
          <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
            <div 
              className="h-full bg-gradient-to-r from-brand to-brand/80 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. USER PROFILE FOOTER */}
      <div className="p-4 border-t border-border">
        <div 
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer" 
          onClick={() => { onClose(); navigate("/profile"); }}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand/10 text-brand overflow-hidden shrink-0">
            {userData.avatar ? (
              <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-sm">
                {(userData.firstName || userData.fullName || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {userData.firstName || userData.fullName} 
            </span>
            <p className="text-xs text-muted-foreground truncate">{userData.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 px-3 py-2.5 mt-3 rounded-lg text-sm font-medium text-red-600 bg-red-500/10 hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}