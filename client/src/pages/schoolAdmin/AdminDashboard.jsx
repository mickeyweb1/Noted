import { useState, useEffect, useCallback } from "react"; // ✅ Added useCallback
import { Users, UserCheck, UserX, TrendingUp, Calendar, Plus, ArrowRight, Clock, Copy, Check, MessageSquare, Shield, GraduationCap, FileText, Trophy } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useUserContext } from "../../context/userContext"; 
import api from "../../utils/api";
 
export default function AdminDashboard() {
  const { user, isAuthLoading } = useUserContext(); 
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
 
const fetchData = useCallback(async () => { // ✅ CHANGED to useCallback
    setIsLoading(true);
    setError(""); // ✅ ADDED
    try {
      const response = await api.get("/admin/stats");
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("❌ Failed to fetch admin stats:", error);
      setError("Couldn't load your dashboard. Please try again."); // ✅ ADDED
    } finally {
      setIsLoading(false);
    }
  }, []);

    useEffect(() => {
    fetchData();
  }, [fetchData]);
 
  const handleCopyCode = () => {
    if (data?.inviteCode) {
      navigator.clipboard.writeText(data.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
 
  const date = new Date();
  const today = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
 
  if (isLoading || isAuthLoading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand"></div>
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }
 
  // ✅ CONDITIONAL STATS: Show different stats for Teachers vs School Owners
  const stats = data?.stats?.isTeacher ? [
    { title: "Total Quizzes", value: data.stats.totalQuizzes || 0, change: "All time", trend: "up", icon: FileText, color: "text-brand", bg: "bg-brand-soft" },
    { title: "Students Assessed", value: data.stats.totalStudentsAssessed || 0, change: "Across all quizzes", trend: "up", icon: Users, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
    { title: "Active Game Shows", value: data.stats.activeGameShows || 0, change: "Currently running", trend: "up", icon: Trophy, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  ] : [
    { title: "Total Teachers", value: data?.stats?.totalTeachers || 0, change: "All time", trend: "up", icon: GraduationCap, color: "text-brand", bg: "bg-brand-soft" },
       { title: "Active Teachers", value: data?.stats?.activeTeachers || 0, change: "Activated", trend: "up", icon: UserCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
    { title: "Pending Invites", value: data?.stats?.inactiveTeachers || 0, change: "Needs attention", trend: "down", icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  if (user?.role === "super_admin" && !data?.stats?.isTeacher) {
    stats.push({ title: "Total Admins", value: data?.stats?.totalAdmins || 0, change: "Platform admins", trend: "up", icon: Shield, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" });
  }
 
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-5 sm:space-y-7 sm:px-5 sm:py-6 lg:space-y-8 lg:px-8">
        {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={fetchData} className="rounded-lg border border-destructive/30 px-3 py-1.5 font-medium hover:bg-destructive/10">Try again</button>
        </div>
      )}
      {/* HEADER */}
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" /> {today}
          </p>
          <h1 className="mt-1 text-2xl font-display font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
            Welcome back, {data?.stats?.isTeacher ? 'Teacher' : (user?.role === 'super_admin' ? 'Super Admin' : 'School Owner')}! 👋
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {data?.stats?.isTeacher 
              ? "Track your quizzes, monitor student progress, and manage your classroom." 
              : "Manage your school's teachers. Teachers will manage their own students via quiz access codes."}
          </p>
        </div>
        {!data?.stats?.isTeacher && (
          <div className="w-full sm:w-auto">
            <button onClick={handleCopyCode} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto sm:px-5">
              <Plus className="w-4 h-4" /> {copied ? "Code Copied!" : "Copy Teacher Invite Code"}
            </button>
          </div>
        )}
      </div>
 
      {/* STATS GRID */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.title} className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
            <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className={`max-w-[62%] truncate rounded-full px-2 py-1 text-right text-xs font-medium ${stat.trend === "up" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                {stat.change}
              </span>
            </div>
            <h3 className="truncate text-2xl font-display font-bold text-foreground">{stat.value}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{stat.title}</p>
          </div>
        ))}
      </div>
 
      {/* MAIN CONTENT GRID */}
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        {/* LEFT: Recent Activity (Quizzes for teachers, Teachers for admins) */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Clock className="h-5 w-5 shrink-0 text-muted-foreground" /> {data?.stats?.isTeacher ? "Recent Quizzes" : "Recent Teachers"}
            </h2>
            <NavLink to={data?.stats?.isTeacher ? "/admin/quiz-results" : "/admin/teachers"} className="flex items-center gap-1 text-right text-sm font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              View all <ArrowRight className="h-4 w-4 shrink-0" />
            </NavLink>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">{data?.stats?.isTeacher ? "Quiz Title" : "Teacher Name"}</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">{data?.stats?.isTeacher ? "Type" : "Role"}</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Status</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.stats?.isTeacher ? data?.recentQuizzes : data?.recentTeachers)?.length > 0 ? 
                  (data?.stats?.isTeacher ? data?.recentQuizzes : data?.recentTeachers).map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-foreground sm:px-5">{item.name}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground sm:px-5">{item.class || item.role || 'N/A'}</td>
                    <td className="px-4 py-4 sm:px-5">
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                        {item.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground sm:px-5">{item.date}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground sm:px-5">
                      {data?.stats?.isTeacher ? "No quizzes created yet." : "No recent teachers found. Share your invite code to add them!"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
 
        {/* RIGHT: Quick Actions */}
        <div className="min-w-0 space-y-5 lg:space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
            <div className="space-y-3">
              {data?.stats?.isTeacher ? (
                <>
                  <NavLink to="/admin/quizzes" className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-transparent bg-brand/5 p-3 transition-all hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-lg bg-brand-soft p-2 text-brand"><FileText className="h-4 w-4" /></div>
                      <span className="text-sm font-medium text-foreground">Create New Quiz</span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
                  </NavLink>
                  <NavLink to="/admin/game-show-creator" className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-transparent bg-purple-500/5 p-3 transition-all hover:bg-purple-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-lg bg-purple-500/10 p-2 text-purple-600"><Trophy className="h-4 w-4" /></div>
                      <span className="text-sm font-medium text-foreground">Start Game Show</span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-purple-600" />
                  </NavLink>
                </>
              ) : (
                <>
                  {user?.role === "super_admin" && (
                    <NavLink to="/admin/feedback" className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-transparent bg-brand/5 p-3 transition-all hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="shrink-0 rounded-lg bg-brand-soft p-2 text-brand"><MessageSquare className="h-4 w-4" /></div>
                        <span className="text-sm font-medium text-foreground">Super Admin Feedback</span>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
                    </NavLink>
                  )}
                  <NavLink to="/admin/billing" className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-transparent bg-muted/30 p-3 transition-all hover:border-electric/30 hover:bg-electric/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-lg bg-electric-soft p-2 text-electric"><TrendingUp className="h-4 w-4" /></div>
                      <span className="text-sm font-medium text-foreground">Upgrade School Plan</span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-electric" />
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}