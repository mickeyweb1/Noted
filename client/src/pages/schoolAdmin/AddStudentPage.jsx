import { useState, useEffect } from "react";
import { UserPlus, Sparkles, Copy, Check, Mail, MessageCircle, ArrowLeft, ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";
import api from "../../utils/api";
 
export default function AddStudent() {
  const [formData, setFormData] = useState({ fullName: "", email: "", className: "", phone: "", parentName: "" });
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");
 
  useEffect(() => {
    // Fetch the school code to display on success
    api.get("/admin/stats").then(res => {
      if (res.data.success) setSchoolCode(res.data.data.inviteCode);
    });
  }, []);
 
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.post("/admin/add-student", formData);
      if (response.data.success) {
        setResult(response.data.data);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add student. Email might already exist.");
    } finally {
      setIsSubmitting(false);
    }
  };
 
  const handleCopyCode = () => {
    navigator.clipboard.writeText(result?.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
 
  const handleReset = () => {
    setFormData({ fullName: "", email: "", className: "", phone: "", parentName: "" });
    setResult(null);
  };
 
  if (result) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-6 sm:p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Student Added Successfully!</h2>
            <p className="text-muted-foreground mt-2">Share these credentials with <strong className="text-foreground">{result.student.fullName}</strong> so they can log in.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto px-2 sm:px-0">
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-xs text-muted-foreground mb-1">Temporary Password</p>
              <p className="font-mono text-lg font-bold text-foreground">{result.tempPassword}</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">School Invite Code</p>
                <p className="font-mono text-lg font-bold text-brand">{result.studentCode}</p>
              </div>
              <button onClick={handleCopyCode} className="p-2 rounded-lg bg-brand-soft text-brand hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`mailto:${result.student.email}?subject=Your Noted Account Credentials&body=Email: ${result.student.email}%0APassword: ${result.tempPassword}%0ASchool Code: ${result.inviteCode}`} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
              <Mail className="w-4 h-4" /> Email Credentials
            </a>
            <a href={`https://wa.me/?text=Welcome to Noted!%0AEmail: ${result.student.email}%0APassword: ${result.tempPassword}%0ASchool Code: ${result.inviteCode}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition-colors">
              <MessageCircle className="w-4 h-4" /> Share via WhatsApp
            </a>
          </div>
          <button onClick={handleReset} className="text-sm font-medium text-brand hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">+ Add another student</button>
        </div>
      </div>
    );
  }
 
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <NavLink to="/admin/students" className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-muted-foreground"><ArrowLeft className="w-5 h-5" /></NavLink>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Add New Student</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter the student's details to create their account and generate credentials.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Full Name <span className="text-destructive">*</span></label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g., Adebayo Johnson" required className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email Address <span className="text-destructive">*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g., adebayo@student.com" required className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Class / Grade <span className="text-destructive">*</span></label>
            <div className="relative">
              <select name="className" value={formData.className} onChange={handleChange} required className="flex h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all">
                <option value="">Select class...</option>
                {["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3", "University"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g., 08012345678" className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Parent / Guardian Name</label>
          <input type="text" name="parentName" value={formData.parentName} onChange={handleChange} placeholder="e.g., Mrs. Johnson" className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all" />
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-brand text-brand-foreground font-semibold text-sm shadow-lg shadow-brand/20 hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? <><span className="w-4 h-4 border-2 border-brand-foreground/30 border-t-brand-foreground rounded-full animate-spin" /> Creating Account...</> : <><UserPlus className="w-4 h-4" /> Create Account & Generate Credentials</>}
        </button>
      </form>
    </div>
  );
}