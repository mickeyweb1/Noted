import { useState, useEffect } from "react";
import {
  User,
  School,
  BookOpen,
  Save,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import api from "../../utils/api";

export default function StudentProfile() {
  const [formData, setFormData] = useState({
    schoolName: "",
    favoriteSubject: "",
    bio: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/me");
        if (response.data.success) {
          const user = response.data.data;
          setFormData({
            schoolName: user.schoolName === "Global" ? "" : user.schoolName,
            favoriteSubject: user.favoriteSubject || "",
            bio: user.bio || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await api.put("/auth/profile", formData);
      if (response.data.success) {
        // Update localStorage so the dashboard reflects changes immediately
        const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
        const updatedInfo = { ...userInfo, ...response.data.data };
        localStorage.setItem("userInfo", JSON.stringify(updatedInfo));

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <NavLink
          to="/dashboard"
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </NavLink>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <User className="w-8 h-8 text-brand" /> My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize your details to unlock school features.
          </p>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6" />
          <div>
            <p className="font-bold">Profile Saved!</p>
            <p className="text-sm">Your school leaderboard is now active.</p>
          </div>
        </div>
      )}

      {/* Profile Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm"
      >
        {/* School Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <School className="w-4 h-4 text-brand" /> School Name
          </label>
          <input
            type="text"
            value={formData.schoolName}
            onChange={(e) =>
              setFormData({ ...formData, schoolName: e.target.value })
            }
            placeholder="e.g., Lincoln High School"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Entering your school name unlocks the School Leaderboard and
            Directory!
          </p>
        </div>

        {/* Favorite Subject */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-electric" /> Favorite Subject
          </label>
          <input
            type="text"
            value={formData.favoriteSubject}
            onChange={(e) =>
              setFormData({ ...formData, favoriteSubject: e.target.value })
            }
            placeholder="e.g., Mathematics, Biology, History"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-flame" /> Short Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell your classmates a bit about yourself..."
            rows="3"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none text-sm"
          />
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-brand-foreground font-semibold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
