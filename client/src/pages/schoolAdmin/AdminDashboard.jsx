import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, TrendingUp, Calendar, Plus, ArrowRight, Clock, Copy, Check } from "lucide-react";
import { NavLink } from "react-router-dom";
import api from "../../utils/api";
 
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
 
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/admin/stats");
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
 
  const handleCopyCode = () => {
    if (data?.inviteCode) {
      navigator.clipboard.writeText(data.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
 
  const date = new Date();
  const today = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
 
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand"></div>
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }
 
  const stats = [
    { title: "Total Students", value: data?.stats?.totalStudents || 0, change: "All time", trend: "up", icon: Users, color: "text-brand", bg: "bg-brand-soft" },
    { title: "Active Students", value: data?.stats?.activeStudents || 0, change: "Last 7 days", trend: "up", icon: UserCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
    { title: "Inactive Students", value: data?.stats?.inactiveStudents || 0, change: "Needs attention", trend: "down", icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
    { title: "School Code", value: data?.inviteCode || "N/A", change: "Share with students", trend: "up", icon: Copy, color: "text-electric", bg: "bg-electric-soft" },
  ];
 
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-5 sm:space-y-7 sm:px-5 sm:py-6 lg:space-y-8 lg:px-8">
      {/* HEADER */}
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4 shrink-0" /> {today}</p>
          <h1 className="mt-1 text-2xl font-display font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">Welcome back, Admin! 👋</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Here is what is happening at <strong>{data?.schoolName || "your school"}</strong> today.</p>
        </div>
        <div className="w-full sm:w-auto">
          <NavLink to="/admin/add-student" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto sm:px-5">
            <Plus className="w-4 h-4" /> Add Student
          </NavLink>
        </div>
      </div>
 
      {/* STATS GRID */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.title} className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
            <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
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
        {/* LEFT: Recent Sign-ups */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Clock className="h-5 w-5 shrink-0 text-muted-foreground" /> Recent Activity</h2>
            <NavLink to="/admin/students" className="flex items-center gap-1 text-right text-sm font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">View all students <ArrowRight className="h-4 w-4 shrink-0" /></NavLink>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Student Name</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Class</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Status</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.recentStudents?.length > 0 ? data.recentStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-foreground sm:px-5">{student.name}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground sm:px-5">{student.class}</td>
                    <td className="px-4 py-4 sm:px-5"><span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">{student.status}</span></td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground sm:px-5">{student.date}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="px-4 py-8 text-center text-muted-foreground sm:px-5">No recent students found.</td></tr>
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
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-transparent bg-muted/30 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-brand-soft p-2 text-brand"><Copy className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">School Invite Code</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">{data?.inviteCode || "Loading..."}</span>
                  </div>
                </div>
                <button onClick={handleCopyCode} className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <NavLink to="/admin/billing" className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-transparent bg-muted/30 p-3 transition-all hover:border-electric/30 hover:bg-electric/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-electric-soft p-2 text-electric"><TrendingUp className="h-4 w-4" /></div>
                  <span className="text-sm font-medium text-foreground">Upgrade Plan</span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-electric" />
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}