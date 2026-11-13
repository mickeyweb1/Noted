import { useState, useEffect } from "react"; // ✅ ADDED useEffect
import { 
  UserPlus, Mail, User, Copy, Check, Loader2, ArrowLeft, 
  ShieldCheck, AlertTriangle, Users
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useUserContext } from "../../context/userContext";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputCls = `w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand ${focusRing}`;
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const secondaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition hover:bg-accent active:scale-[0.99] ${focusRing}`;

export default function AddTeacher() {
  const navigate = useNavigate();
  const { user } = useUserContext();
  
  const isOwner = user?.role === "school_admin" || user?.role === "super_admin";
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [role, setRole] = useState("teacher"); 
  const [copiedField, setCopiedField] = useState(null);
  
  // ✅ NEW: State for slots
  const [slots, setSlots] = useState(null);

  // ✅ NEW: Fetch slot capacity when the page loads
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const response = await api.get("/admin/teachers");
        if (response.data.success && response.data.data.slots) {
          setSlots(response.data.data.slots);
        }
      } catch (err) {
        console.error("Failed to fetch teacher slots:", err);
      }
    };
    fetchSlots();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessData(null);

    try {
      const response = await api.post("/admin/add-teacher", {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: isOwner ? role : "teacher", 
      });

      if (response.data.success) {
        setSuccessData(response.data.data);
      }
    } catch (err) {
      console.error("Failed to add teacher:", err);
      setError(err.response?.data?.message || "Failed to add teacher. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReset = () => {
    setFullName("");
    setEmail("");
    setSuccessData(null);
    setError("");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Link to="/admin/dashboard" className={`p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${focusRing}`}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground md:text-3xl">Add a New Teacher</h1>
          <p className="text-sm text-muted-foreground">Generate a unique invite code to link a teacher to your school.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        {successData ? (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                {successData.teacher?.role === "hod" ? "Head of Department Added Successfully!" : "Teacher Added Successfully!"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Share the <strong>Invite Code</strong> below with <strong>{successData.teacher.fullName}</strong>. 
                They will use this code along with their email to claim their account and set their own password.
              </p>
            </div>

            <div className="mx-auto max-w-md space-y-4 text-left">
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-brand">Invite Code</label>
                <div className="flex items-center gap-3">
                  <span className="flex-1 font-mono text-2xl font-bold tracking-widest text-foreground">
                    {successData.teacherCode}
                  </span>
                  <button 
                    onClick={() => handleCopy(successData.teacherCode, "code")}
                    className={`rounded-lg p-2 transition-colors ${copiedField === "code" ? "bg-green-500 text-white" : "bg-background text-muted-foreground hover:text-foreground"}`}
                  >
                    {copiedField === "code" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
              <button onClick={handleReset} className={primaryBtn}>
                <UserPlus className="h-4 w-4" /> Add Another Teacher
              </button>
              <button onClick={() => navigate("/admin/teachers")} className={secondaryBtn}>
                View All Teachers
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ✅ NEW: Slot Capacity Display */}
            {slots && (
              <div className={`rounded-xl border p-4 ${slots.used >= slots.max ? 'border-destructive/30 bg-destructive/10' : 'border-brand/20 bg-brand/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    Teacher Capacity: {slots.used} / {slots.max} used
                  </span>
                  <span className={`text-xs font-bold ${slots.used >= slots.max ? 'text-destructive' : 'text-brand'}`}>
                    {slots.max - slots.used} slots remaining
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${slots.used >= slots.max ? 'bg-destructive' : 'bg-brand'}`} 
                    style={{ width: `${slots.max > 0 ? Math.min((slots.used / slots.max) * 100, 100) : 0}%` }}
                  ></div>
                </div>
                {slots.used >= slots.max && (
                  <p className="mt-2 text-xs text-destructive font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> 
                    You have reached your teacher limit. Please contact support to purchase an extra slot before adding more teachers.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="fullName" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-muted-foreground" /> Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Mr. John Smith"
                className={inputCls}
                required
                disabled={isLoading || (slots && slots.used >= slots.max)} // ✅ Disable if no slots left
              />
            </div>

            {isOwner && (
              <div className="space-y-2">
                <label htmlFor="role" className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" /> Account Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={inputCls}
                  required
                  disabled={isLoading || (slots && slots.used >= slots.max)}
                >
                  <option value="teacher">Teacher</option>
                  <option value="hod">Head of Department (Mini-Admin)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Heads of Department can manage their own teachers and view their results, while the main admin oversees everything.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" /> Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className={inputCls}
                required
                disabled={isLoading || (slots && slots.used >= slots.max)}
              />
              <p className="text-xs text-muted-foreground">
                We will pre-create their account. They will use this email along with the invite code to set their own password.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button 
                type="submit" 
                disabled={isLoading || (slots && slots.used >= slots.max)} 
                className={primaryBtn}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating Code...</>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Generate Invite Code</>
                )}
              </button>
              <button type="button" onClick={() => navigate("/admin/dashboard")} className={secondaryBtn}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
