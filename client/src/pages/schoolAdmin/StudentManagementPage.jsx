import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Copy,
  Check,
  UserPlus,
  UserX,
  UserCheck,
  Clock,
  ChevronDown,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import api from "../../utils/api";

export default function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [schoolCode, setSchoolCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ NEW: State for the selected date (defaults to today)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get("/admin/students");
        if (response.data.success) {
          setStudents(response.data.data.students);
          setSchoolCode(response.data.data.inviteCode);
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Filtering logic
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass =
      classFilter === "all" || student.className === classFilter;
    const matchesStatus =
      statusFilter === "all" || student.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(schoolCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Activate/Deactivate logic
  const toggleStudentStatus = async (id) => {
    try {
      const response = await api.patch(`/admin/students/${id}/status`);
      if (response.data.success) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: response.data.data.isActive ? "active" : "inactive",
                }
              : s,
          ),
        );
      }
    } catch (error) {
      alert(
        error.response?.data?.message || "Failed to update student status.",
      );
    }
  };

  // ✅ NEW: Helper to format minutes into "Xh Ym"
  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const uniqueClasses = [...new Set(students.map((s) => s.className))];

  if (isLoading)
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand"></div>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-5 sm:py-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold leading-tight text-foreground sm:text-3xl">
            Student Directory
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage your students and control their access.
          </p>
        </div>
        <NavLink
          to="/admin/add-student"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand/90 sm:w-auto sm:px-5"
        >
          <UserPlus className="w-4 h-4" /> Add Student
        </NavLink>
      </div>

      {/* School Invite Code Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            School Invite Code
          </p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
            Share this code with students so they can activate their accounts.
          </p>
        </div>
        <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 sm:w-auto sm:justify-start sm:px-4">
          <span className="truncate font-mono text-lg font-bold tracking-wider text-brand">
            {schoolCode || "Loading..."}
          </span>
          <button
            onClick={handleCopyCode}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ✅ Date Picker for Admin */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:p-5">
        <Clock className="h-5 w-5 shrink-0 text-brand" />
        <label className="text-sm font-medium text-foreground sm:shrink-0">
          View Time Spent for Date:
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48"
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="flex h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="relative w-full md:w-40">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-8 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All Classes</option>
            {uniqueClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="relative w-full md:w-40">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-8 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <strong className="text-foreground">{filteredStudents.length}</strong>{" "}
        students
      </p>

      {/* Clean Student Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold text-muted-foreground sm:px-6">
                  Student
                </th>
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold text-muted-foreground sm:px-6">
                  Class
                </th>
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold text-muted-foreground sm:px-6">
                  Status
                </th>
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold text-muted-foreground sm:px-6">
                  Time Spent
                </th>{" "}
                {/* ✅ NEW COLUMN */}
                <th className="whitespace-nowrap px-4 py-4 text-right font-semibold text-muted-foreground sm:px-6">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    {/* Name & Email */}
                    <td className="px-4 py-4 sm:px-6">
                      <p className="whitespace-nowrap font-medium text-foreground">
                        {student.fullName}
                      </p>
                      <p className="mt-0.5 max-w-[16rem] truncate text-xs text-muted-foreground">
                        {student.email}
                      </p>
                    </td>

                    {/* Class */}
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-foreground sm:px-6">
                      {student.className}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4 sm:px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          student.status === "active"
                            ? "bg-green-500/10 text-green-600"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${student.status === "active" ? "bg-green-500" : "bg-red-500"}`}
                        />
                        {student.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* ✅ Time Spent Column */}
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-foreground sm:px-6">
                      {formatTime(student.dailyFocusLog?.get(selectedDate))}
                    </td>

                    {/* Direct Action Button */}
                    <td className="px-4 py-4 text-right sm:px-6">
                      <button
                        onClick={() => toggleStudentStatus(student.id)}
                        className={`inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 ${
                          student.status === "active"
                            ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20"
                            : "bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20"
                        }`}
                      >
                        {student.status === "active" ? (
                          <UserX className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                        {student.status === "active"
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-12 text-center text-muted-foreground sm:px-6"
                  >
                    <p className="font-medium">No students found.</p>
                    <p className="mt-1 text-xs">
                      Try adjusting your search or filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );

}