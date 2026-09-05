import { useState } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle, Lock, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./authLayout"; // Adjust path if needed
import api from "../utils/api";

export default function SchoolStudentRegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    fullName: "", // ✅ ADDED: Required by database
    uniqueInviteCode: "", 
    email: "", 
    password: "" 
  });
  const [codeStatus, setCodeStatus] = useState("idle");
  const [schoolName, setSchoolName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateCode = async (code) => {
    console.log("🔍 Attempting to validate code:", code); // <-- NEW: See what code is being sent
    
    // Temporarily commented out to force the request no matter the length
    // if (code.length < 5) { setCodeStatus("idle"); return; } 
    
    setCodeStatus("checking");
    try {
      console.log("📡 Sending request to backend..."); // <-- NEW
      const response = await api.post("/auth/validate-code", { code });
      console.log("✅ Backend responded:", response.data); // <-- NEW
      
      if (response.data.success) {
        setCodeStatus("valid");
        setSchoolName(response.data.data.schoolName);
        setError("");
      }
    } catch (err) {
      console.error("❌ Validation failed:", err.response?.data || err); // <-- NEW
      setCodeStatus("invalid");
      setSchoolName("");
    }
  };

  const handleCodeBlur = () => validateCode(formData.uniqueInviteCode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (codeStatus !== "valid") { 
      setError("Please enter a valid invite code."); 
      return; 
    }
    setIsSubmitting(true);
    setError("");
    
    try {
      const response = await api.post("/auth/claim", {
        fullName: formData.fullName, // ✅ ADDED: Send fullName to satisfy database requirement
        uniqueInviteCode: formData.uniqueInviteCode,
        email: formData.email,
        password: formData.password,
      });
      
      if (response.data.success) {
        localStorage.setItem("userToken", response.data.token);
        localStorage.setItem("userInfo", JSON.stringify(response.data.user || response.data));
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Activation failed. Check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-6 md:p-8">
          <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
          </Link>
          <div className="max-w-md mx-auto space-y-6">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 text-brand mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Activate Your Account</h1>
              <p className="text-sm text-muted-foreground">Enter the unique code and email your administrator gave you to set your password.</p>
            </div>
            
            {error && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ✅ NEW: Full Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="fullName" 
                  value={formData.fullName} 
                  onChange={handleChange} 
                  placeholder="e.g., Adebayo Johnson" 
                  required 
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Your Unique Invite Code <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="uniqueInviteCode" 
                    value={formData.uniqueInviteCode} 
                    onChange={handleChange} 
                    onBlur={handleCodeBlur} 
                    placeholder="e.g., STU-A3K7-X9M2" 
                    required
                    className={`flex h-11 w-full rounded-md border px-3 py-2 text-sm font-mono tracking-wider focus-visible:outline-none focus-visible:ring-2 transition-all ${
                      codeStatus === "valid" ? "border-green-500 bg-green-500/5" : 
                      codeStatus === "invalid" ? "border-red-500 bg-red-500/5" : 
                      "border-brand bg-brand/5"
                    }`} 
                  />
                  {codeStatus === "checking" && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />}
                  {codeStatus === "valid" && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
                  {codeStatus === "invalid" && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />}
                </div>
                {codeStatus === "valid" && <p className="text-xs text-green-600 font-medium">✅ Verified: {schoolName}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Your Email <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="e.g., adebayo@student.com" 
                  required 
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Create Password <span className="text-red-500">*</span></label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder="••••••••" 
                  required 
                  minLength="6" 
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || codeStatus !== "valid"} 
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-md bg-brand text-brand-foreground font-semibold text-sm hover:bg-brand/90 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand/20"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Activating...</>
                ) : (
                  "Activate Account & Log In"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}