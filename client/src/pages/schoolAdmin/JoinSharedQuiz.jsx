import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, Loader2, AlertTriangle, Trash2, ExternalLink } from "lucide-react";
import api from "../../utils/api";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const secondaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export default function JoinSharedQuiz() {
  const navigate = useNavigate();
  const [shareCode, setShareCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedShares, setSavedShares] = useState([]);

  // Load saved shares from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("noted_shared_quizzes");
    if (saved) {
      try {
        setSavedShares(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved shares");
      }
    }
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (shareCode.trim().length < 5) return setError("Please enter a valid share code.");
    
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get(`/quiz/shared-results?shareCode=${shareCode.trim()}`);
      if (res.data.success) {
        // ✅ FIX: The backend returns "quizzes" (an array), so we get the first one
        const newShare = { 
          shareCode: shareCode.trim().toUpperCase(), 
          quizTitle: res.data.data.quizzes[0]?.title || "Shared Quiz", // ✅ FIXED
          joinedAt: new Date().toISOString() 
        };
        const updatedShares = [newShare, ...savedShares.filter(s => s.shareCode !== newShare.shareCode)];
        localStorage.setItem("noted_shared_quizzes", JSON.stringify(updatedShares));
        setSavedShares(updatedShares);
        
        // Navigate to the shared results page
        navigate(`/admin/shared-quiz-results?code=${newShare.shareCode}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired share code.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeShare = (code) => {
    const updated = savedShares.filter(s => s.shareCode !== code);
    localStorage.setItem("noted_shared_quizzes", JSON.stringify(updated));
    setSavedShares(updated);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Join Form */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft">
            <Share2 className="h-8 w-8 text-brand" />
          </div>
          <h1 className="mb-2 text-center text-2xl font-bold text-foreground">Join Shared Quiz</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Enter the share code provided by your colleague to view their quiz results.
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="share-code" className="mb-1.5 block text-sm font-medium text-foreground">Share Code</label>
              <input
                id="share-code"
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase())}
                placeholder="e.g., SHARE-8X92A1B3"
                className={`w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-lg tracking-wider text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand ${focusRing}`}
                required
              />
            </div>
            <button type="submit" disabled={isLoading || shareCode.length < 5} className={`${primaryBtn} w-full`}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "View Shared Results"}
            </button>
          </form>
        </div>

        {/* Saved Shares List */}
        {savedShares.length > 0 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-foreground">My Shared Quizzes</h2>
            <div className="space-y-3">
              {savedShares.map((share) => (
                <div key={share.shareCode} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{share.quizTitle || "Shared Quiz"}</p>
                    <p className="text-xs font-mono text-muted-foreground">{share.shareCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate(`/admin/shared-quiz-results?code=${share.shareCode}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-brand transition hover:bg-accent"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </button>
                    <button 
                      onClick={() => removeShare(share.shareCode)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      title="Remove from list"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={() => navigate("/admin/quiz-results")} 
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to my quizzes
        </button>
      </div>
    </div>
  );
}