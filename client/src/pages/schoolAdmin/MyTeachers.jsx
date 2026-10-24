import { useState, useEffect } from "react";
import { ArrowLeft, Users, Copy, Check, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function MyTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await api.get("/admin/teachers");
        if (response.data.success) {
          setTeachers(response.data.data.teachers);
          setSchoolName(response.data.data.schoolName);
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      {/* Header */}
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

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand"></div>
          </div>
        ) : teachers.length === 0 ? (
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
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Email</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Invite Code</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Status</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-muted/20 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-foreground sm:px-5">{teacher.fullName}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground sm:px-5">{teacher.email}</td>
                    <td className="px-4 py-4 sm:px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold tracking-wider text-foreground">{teacher.uniqueInviteCode}</span>
                        <button 
                          onClick={() => handleCopy(teacher.uniqueInviteCode, teacher.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-brand-soft hover:text-brand transition-colors"
                        >
                          {copiedId === teacher.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 sm:px-5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        teacher.status === 'active' 
                          ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                          : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                      }`}>
                        {teacher.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground sm:px-5">{teacher.dateAdded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}