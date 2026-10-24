import { useState } from "react";
import { 
  UserPlus, Mail, User, Copy, Check, Loader2, ArrowLeft, 
  ShieldCheck, AlertTriangle 
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";

// Shared styles for consistency
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputCls = `w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand ${focusRing}`;
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const secondaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition hover:bg-accent active:scale-[0.99] ${focusRing}`;

export default function AddTeacher() {
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/dashboard" className={`p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${focusRing}`}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground md:text-3xl">Add a New Teacher</h1>
          <p className="text-sm text-muted-foreground">Generate a unique invite code to link a teacher to your school.</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        
        {/* SUCCESS STATE */}
        {successData ? (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Teacher Added Successfully!</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Share the <strong>Invite Code</strong> and <strong>Temporary Password</strong> below with <strong>{successData.teacher.fullName}</strong>. 
                They will use these to create their account and link to your school.
              </p>
            </div>

            <div className="mx-auto max-w-md space-y-4 text-left">
              {/* Invite Code Box */}
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-brand">Teacher Invite Code</label>
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

              {/* Temp Password Box */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temporary Password</label>
                <div className="flex items-center gap-3">
                  <span className="flex-1 font-mono text-lg font-bold text-foreground">
                    {successData.tempPassword}
                  </span>
                  <button 
                    onClick={() => handleCopy(successData.tempPassword, "password")}
                    className={`rounded-lg p-2 transition-colors ${copiedField === "password" ? "bg-green-500 text-white" : "bg-background text-muted-foreground hover:text-foreground"}`}
                  >
                    {copiedField === "password" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
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
          /* FORM STATE */
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
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
                disabled={isLoading}
              />
            </div>

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
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                We will pre-create their account. They will use this email along with the invite code to set their own password.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button type="submit" disabled={isLoading} className={primaryBtn}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating Code...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> Generate Invite Code
                  </>
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