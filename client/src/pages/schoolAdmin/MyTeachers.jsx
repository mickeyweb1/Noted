import { useState, useEffect } from "react";
import { ArrowLeft, Users, Copy, Check, UserPlus, Zap, X } from "lucide-react"; 
import { Link } from "react-router-dom";
import api from "../../utils/api";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function MyTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [slots, setSlots] = useState(null); // ✅ NEW
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await api.get("/admin/teachers");
        if (response.data.success) {
          setTeachers(response.data.data.teachers);
          setSchoolName(response.data.data.schoolName);
          setSlots(response.data.data.slots); // ✅ NEW
        }
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTopUpCredits = async (teacherId, teacherName) => {
    if (!window.confirm(`Give ${teacherName} a fresh monthly allowance of AI credits?`)) return;
    try {
      const res = await api.post(`/admin/teachers/${teacherId}/topup-credits`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to top up credits.");
    }
  };

  // ✅ NEW: Handle removing a teacher to free up a slot
  const handleRemoveTeacher = async (teacherId, teacherName) => {
    if (!window.confirm(`Are you sure you want to remove ${teacherName}? This will free up 1 teacher slot and they will lose access.`)) return;
    try {
      await api.delete(`/admin/teachers/${teacherId}`);
      const response = await api.get("/admin/teachers");
      if (response.data.success) {
        setTeachers(response.data.data.teachers);
        setSlots(response.data.data.slots);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove teacher.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard" className={`p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${focusRing}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground md:text-3xl">My Teachers</h1>
            <p className="text-sm text-muted-foreground">Manage the teachers linked to {schoolName}.</p>
          </div>
        </div>
        <Link to="/admin/add-teacher" className={`inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 ${focusRing}`}>
          <UserPlus className="h-4 w-4" /> Add New Teacher
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand"></div>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            {/* ✅ MOVED: Slot Counter is now ALWAYS visible if slots data exists, even if 0 teachers */}
            {slots && (
              <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">Teacher Capacity: {slots.used} / {slots.max} used</span>
                  <span className="text-xs text-muted-foreground">{slots.max - slots.used} slots remaining</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${slots.used >= slots.max ? 'bg-destructive' : 'bg-brand'}`} 
                    style={{ width: `${slots.max > 0 ? Math.min((slots.used / slots.max) * 100, 100) : 0}%` }}
                  ></div>
                </div>
                {slots.used >= slots.max && (
                  <p className="mt-2 text-xs text-destructive font-medium">
                    Limit reached. To add an extra teacher, please contact support via WhatsApp to purchase an additional slot.
                  </p>
                )}
              </div>
            )}

            {teachers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">No teachers added yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Click "Add New Teacher" to generate an invite code for your staff.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[38rem] text-sm">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium sm:px-5">Teacher Name</th>
                    <th className="px-4 py-3 text-left font-medium sm:px-5">Role</th>
                    <th className="px-4 py-3 text-left font-medium sm:px-5">Email</th>
                    <th className="px-4 py-3 text-left font-medium sm:px-5">Invite Code</th>
                    <th className="px-4 py-3 text-left font-medium sm:px-5">Status</th>
                    <th className="px-4 py-3 text-left font-medium sm:px-5">Actions</th>
                    <th className="px-4 py-3 text-left font-medium sm:px-5">Date Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-muted/20 transition-colors">
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-foreground sm:px-5">{teacher.fullName}</td>
                      <td className="px-4 py-4 sm:px-5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${teacher.role === 'hod' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
                          {teacher.role === 'hod' ? 'Head of Dept' : 'Teacher'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground sm:px-5">{teacher.email}</td>
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold tracking-wider text-foreground">{teacher.uniqueInviteCode}</span>
                          <button onClick={() => handleCopy(teacher.uniqueInviteCode, teacher.id)} className="rounded p-1 text-muted-foreground hover:bg-brand-soft hover:text-brand transition-colors">
                            {copiedId === teacher.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${teacher.status === 'active' ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"}`}>
                          {teacher.status === 'active' ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleTopUpCredits(teacher.id, teacher.fullName)} className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 transition-colors" title="Reset monthly AI credits">
                            <Zap className="h-3.5 w-3.5" /> Top Up
                          </button>
                          <button onClick={() => handleRemoveTeacher(teacher.id, teacher.fullName)} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors" title="Remove teacher and free up slot">
                            <X className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground sm:px-5">{teacher.dateAdded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
