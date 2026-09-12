import { useState } from "react";
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  CreditCard, 
  Shield, 
  Trash2, 
  Save, 
  Camera,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

// Reusable Toggle Switch Component for a clean UI
const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1 pr-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked ? "bg-brand" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

export default function SettingsPage() {
  // Mock user data (Replace with your useUserContext data later)
  const [profile, setProfile] = useState({
    fullName: "Adebayo Johnson",
    email: "adebayo@noted.com",
    role: "School Admin", // Could be "Student", "Personal User", etc.
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    studyReminders: true,
    weeklyReport: false,
    communityUpdates: true,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleProfileSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate backend API call
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("New passwords do not match!");
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setPasswords({ current: "", new: "", confirm: "" });
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, preferences, and security.</p>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">Settings saved successfully!</span>
        </div>
        )}

      {/* ================= 1. PROFILE INFORMATION ================= */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-5">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center text-brand text-2xl font-bold border-2 border-border">
                {profile.fullName.charAt(0)}
              </div>
              <button type="button" className="absolute bottom-0 right-0 p-1.5 rounded-full bg-brand text-white shadow-md hover:bg-brand/90 transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile.fullName}</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand mt-1">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-brand text-brand-foreground font-medium text-sm hover:bg-brand/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>

      {/* ================= 2. NOTIFICATIONS ================= */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="divide-y divide-border">
          <Toggle 
            label="Email Alerts" 
            description="Receive emails about account activity and important updates."
            checked={notifications.emailAlerts}
            onChange={(val) => setNotifications({ ...notifications, emailAlerts: val })}
          />
          <Toggle 
            label="Study Reminders" 
            description="Get gentle nudges when it's time for your scheduled focus sessions."
            checked={notifications.studyReminders}
            onChange={(val) => setNotifications({ ...notifications, studyReminders: val })}
          />
          <Toggle 
            label="Weekly Progress Report" 
            description="Receive a summary of your or your student's study hours every Sunday."
            checked={notifications.weeklyReport}
            onChange={(val) => setNotifications({ ...notifications, weeklyReport: val })}
          />
          <Toggle 
            label="Community Updates" 
            description="Get notified when new public study materials are added to the library."
            checked={notifications.communityUpdates}
            onChange={(val) => setNotifications({ ...notifications, communityUpdates: val })}
          />
        </div>
      </div>

      {/* ================= 3. SECURITY ================= */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-semibold text-foreground">Security & Password</h2>
        </div>

        <form onSubmit={handlePasswordSave} className="space-y-5 max-w-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Current Password</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">New Password</label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !passwords.new}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-brand text-brand-foreground font-medium text-sm hover:bg-brand/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* ================= 4. BILLING (Unified) ================= */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-semibold text-foreground">Billing & Subscription</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border">
          <div>
            <p className="font-semibold text-foreground">Premium School Plan</p>
            <p className="text-sm text-muted-foreground mt-1">₦1,500 / student / month • Next billing date: Feb 15, 2026</p>
          </div>
          <button className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-accent transition-colors shrink-0">
            Manage Plan
          </button>
        </div>
      </div>

      {/* ================= 5. DANGER ZONE ================= */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">Delete your account</p>
            <p className="text-sm text-muted-foreground mt-1">Once you delete your account, there is no going back. All data, notes, and progress will be permanently lost.</p>
          </div>
          <button className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors shrink-0">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>

    </div>
  );
}