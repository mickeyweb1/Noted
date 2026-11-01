import { useEffect, useState } from "react";
import { Check, LockKeyhole, Moon, Sun, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserContext } from "../context/userContext";
import { useTheme } from "../hooks/useTheme";
import api from "../utils/api";

const fieldClassName = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-brand";
const planNames = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
  school_owner: "School Owner",
  school_pro: "School Pro",
  school_premium: "School Premium",
};

const profileFromUser = (user) => {
  const nameParts = (user?.fullName || "").trim().split(/\s+/);
  return {
    firstName: user?.firstName || nameParts[0] || "",
    lastName: user?.lastName || nameParts.slice(1).join(" "),
    phone: user?.phone || "",
    favoriteSubject: user?.favoriteSubject || "",
    bio: user?.bio || "",
  };
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

export default function SettingsPage() {
  const { user, refreshUser } = useUserContext();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState(() => profileFromUser(user));
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    setProfile(profileFromUser(user));
  }, [user]);

  const updateProfileField = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
    setProfileSaved(false);
    setProfileError("");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    if (!firstName) {
      setProfileError("First name is required.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");
    setProfileSaved(false);
    try {
      await api.put("/auth/profile", {
        firstName,
        lastName,
        fullName: [firstName, lastName].filter(Boolean).join(" "),
        phone: profile.phone.trim(),
        favoriteSubject: profile.favoriteSubject.trim(),
        bio: profile.bio.trim(),
      });
      await refreshUser();
      setProfileSaved(true);
    } catch (error) {
      setProfileError(getErrorMessage(error, "Unable to save your profile. Please try again."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const updatePasswordField = (field) => (event) => {
    setPassword((current) => ({ ...current, [field]: event.target.value }));
    setPasswordError("");
    setPasswordSaved(false);
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (password.newPassword.length < 8) {
      setPasswordError("Your new password must be at least 8 characters.");
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSaved(false);
    try {
      await api.put("/auth/change-password", {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSaved(true);
    } catch (error) {
      setPasswordError(getErrorMessage(error, "Unable to change your password. Please try again."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isSchoolManaged = Boolean(user?.schoolId || user?.schoolOwnerId);
  const endsAt = user?.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null;
  const hasActivePlan = Boolean(
    user?.subscriptionTier
      && user.subscriptionTier !== "free"
      && user.subscriptionStatus === "active"
      && (!endsAt || endsAt > new Date()),
  );
  const planName = planNames[user?.subscriptionTier] || "Free";

  return (
    <main className="min-h-screen w-full bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your profile, appearance, security, and plan.</p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
            <UserRound className="h-5 w-5 text-brand" />
            <div>
              <h2 className="font-semibold">Profile information</h2>
              <p className="text-sm text-muted-foreground">Update the details associated with your account.</p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">
                First name
                <input autoComplete="given-name" required value={profile.firstName} onChange={updateProfileField("firstName")} className={fieldClassName} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Last name
                <input autoComplete="family-name" value={profile.lastName} onChange={updateProfileField("lastName")} className={fieldClassName} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Email address
                <input type="email" autoComplete="email" value={user?.email || ""} readOnly className={`${fieldClassName} cursor-not-allowed text-muted-foreground`} />
                <span className="block text-xs font-normal text-muted-foreground">Contact support to change your email address.</span>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Phone number
                <input type="tel" autoComplete="tel" value={profile.phone} onChange={updateProfileField("phone")} className={fieldClassName} />
              </label>
              <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                Favorite subject
                <input value={profile.favoriteSubject} onChange={updateProfileField("favoriteSubject")} className={fieldClassName} />
              </label>
              <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                About you
                <textarea rows={3} maxLength={500} value={profile.bio} onChange={updateProfileField("bio")} className={`${fieldClassName} resize-y`} />
                <span className="block text-right text-xs font-normal text-muted-foreground">{profile.bio.length}/500</span>
              </label>
            </div>
            {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}
            {profileSaved && <p role="status" className="flex items-center gap-1.5 text-sm text-green-600"><Check className="h-4 w-4" /> Profile saved.</p>}
            <button type="submit" disabled={isSavingProfile} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
            {theme === "dark" ? <Moon className="h-5 w-5 text-brand" /> : <Sun className="h-5 w-5 text-brand" />}
            <div>
              <h2 className="font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">Choose how Noted looks on this device.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {["light", "dark"].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={theme === option}
                onClick={() => setTheme(option)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition ${theme === option ? "border-brand bg-brand/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent"}`}
              >
                {option} mode
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
            <LockKeyhole className="h-5 w-5 text-brand" />
            <div>
              <h2 className="font-semibold">Password and security</h2>
              <p className="text-sm text-muted-foreground">Change your password using your current password.</p>
            </div>
          </div>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                Current password
                <input type="password" autoComplete="current-password" required value={password.currentPassword} onChange={updatePasswordField("currentPassword")} className={fieldClassName} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                New password
                <input type="password" autoComplete="new-password" minLength={8} required value={password.newPassword} onChange={updatePasswordField("newPassword")} className={fieldClassName} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Confirm new password
                <input type="password" autoComplete="new-password" minLength={8} required value={password.confirmPassword} onChange={updatePasswordField("confirmPassword")} className={fieldClassName} />
              </label>
            </div>
            {passwordError && <p role="alert" className="text-sm text-destructive">{passwordError}</p>}
            {passwordSaved && <p role="status" className="flex items-center gap-1.5 text-sm text-green-600"><Check className="h-4 w-4" /> Password updated.</p>}
            <button type="submit" disabled={isChangingPassword} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60">
              {isChangingPassword ? "Updating..." : "Update password"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <h2 className="font-semibold">Your plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActivePlan ? `${planName} plan` : "Free plan"}
            {hasActivePlan && endsAt && <> · Active until {endsAt.toLocaleDateString()}</>}
          </p>
          {isSchoolManaged ? (
            <p className="mt-3 text-sm text-muted-foreground">Your access is managed by your school. Contact your school administrator about plan changes.</p>
          ) : (
            <Link to="/pricing" className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90">
              {hasActivePlan ? "View plans" : "Explore plans"}
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}
