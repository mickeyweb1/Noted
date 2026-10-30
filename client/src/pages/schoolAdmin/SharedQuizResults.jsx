import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, FileText, Users, Clock, Eye, Copy, Plus, Loader2, Check, AlertTriangle, CheckCircle2
} from "lucide-react";
import api from "../../utils/api";
import Modal from "../../components/Modal";
import MathRenderer from "../../components/MathRenderer";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const secondaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export default function SharedQuizResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shareCode = searchParams.get("code");
  
  const [quizzes, setQuizzes] = useState([]);
  const [submissionsByQuiz, setSubmissionsByQuiz] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal states
  const [activeQuizForQuestions, setActiveQuizForQuestions] = useState(null);
  const [activeQuizForCodes, setActiveQuizForCodes] = useState(null);
  const [isAddingCode, setIsAddingCode] = useState(false);
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState("");
  const [lastChecked, setLastChecked] = useState(Date.now());

  const fetchData = async () => {
    try {
      const res = await api.get(`/quiz/shared-results?shareCode=${shareCode}`);
      if (res.data.success) {
        // ✅ FIX: Handle multiple quizzes instead of just the first one
        const sharedQuizzes = res.data.data.quizzes;
        setQuizzes(sharedQuizzes);
        
        // Group submissions by quiz ID for easier rendering
        const subsByQuiz = {};
        res.data.data.submissions.forEach(sub => {
          if (!subsByQuiz[sub.quiz]) subsByQuiz[sub.quiz] = [];
          subsByQuiz[sub.quiz].push(sub);
        });
        setSubmissionsByQuiz(subsByQuiz);
        setError("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load shared quiz. The code may be invalid, expired, or revoked.");
      if (err.response?.status === 404 || err.response?.data?.message?.includes("revoked")) {
        setTimeout(() => {
          navigate("/admin/join-shared-quiz", { 
            state: { message: "This share code has been revoked or expired." }
          });
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shareCode) {
      setError("No share code provided in the URL.");
      setLoading(false);
      return;
    }

    fetchData();
    
    // Auto-refresh every 30 seconds to check if code was revoked
    const interval = setInterval(() => {
      fetchData();
      setLastChecked(Date.now());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [shareCode]);

  const handleAddCode = async (targetQuizId) => {
    setIsAddingCode(true);
    try {
      const res = await api.post("/quiz/shared-regenerate", { shareCode, quizId: targetQuizId });
      if (res.data.success) {
        setNewlyGeneratedCode(res.data.newCode);
        await fetchData();
        setTimeout(() => {
          alert(`✅ New access code generated: ${res.data.newCode}\n\nThe modal has been opened so you can copy it!`);
        }, 100);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate new code.");
    } finally {
      setIsAddingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-destructive">Access Denied</h2>
        <p className="max-w-md text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground">Redirecting to join page...</p>
        <button onClick={() => navigate("/admin/join-shared-quiz")} className={primaryBtn}>
          Go to Join Page
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin/join-shared-quiz")} className={`rounded-lg p-2 text-muted-foreground hover:bg-accent ${focusRing}`}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Shared Quizzes</h1>
              <p className="text-sm text-muted-foreground">
                {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} shared with you
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last checked: {new Date(lastChecked).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* ✅ Map over ALL shared quizzes */}
        {quizzes.map((quiz) => {
          const quizSubmissions = submissionsByQuiz[quiz._id] || [];
          return (
            <div key={quiz._id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border p-4 sm:p-5 bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{quiz.title}</h2>
                    <p className="text-sm text-muted-foreground">Shared by: {quiz.createdBy?.fullName || "Unknown Teacher"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setActiveQuizForCodes(quiz)} className={secondaryBtn}>
                      <Users className="h-4 w-4" /> View Codes ({quiz.accessCodes?.length || 0})
                    </button>
                    <button onClick={() => setActiveQuizForQuestions(quiz)} className={secondaryBtn}>
                      <Eye className="h-4 w-4" /> View Questions
                    </button>
                    <button 
                      onClick={() => {
                        setActiveQuizForCodes(quiz);
                        handleAddCode(quiz._id);
                      }} 
                      disabled={isAddingCode} 
                      className={primaryBtn}
                    >
                      {isAddingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add Code</>}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                  <FileText className="h-5 w-5 text-brand" /> Student Submissions ({quizSubmissions.length})
                </h3>
                
                {quizSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-xl">
                    No students have submitted this quiz yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Student Name</th>
                          <th className="px-4 py-3 text-left font-medium">Class</th>
                          <th className="px-4 py-3 text-left font-medium">Score</th>
                          <th className="px-4 py-3 text-left font-medium">Percentage</th>
                          <th className="px-4 py-3 text-left font-medium">Time Taken</th>
                          <th className="px-4 py-3 text-left font-medium">Tab Switches</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {quizSubmissions.map((sub) => {
                          const max = sub.maxScore || sub.totalQuestions || 1;
                          const pct = Math.round((sub.score / max) * 100);
                          return (
                            <tr key={sub._id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{sub.studentName} {sub.studentSurname}</td>
                              <td className="px-4 py-3 text-muted-foreground">{sub.studentClass || "—"}</td>
                              <td className="px-4 py-3 font-semibold text-foreground">{sub.score} / {max}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  pct >= 70 ? "bg-green-500/10 text-green-600" : 
                                  pct >= 50 ? "bg-yellow-500/10 text-yellow-600" : 
                                  "bg-destructive/10 text-destructive"
                                }`}>
                                  {pct}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {Math.floor((sub.timeTaken || 0) / 60)}m {(sub.timeTaken || 0) % 60}s
                              </td>
                              <td className="px-4 py-3">
                                {sub.tabSwitchCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-destructive">
                                    <AlertTriangle className="h-3.5 w-3.5" /> {sub.tabSwitchCount}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ View Questions Modal */}
      {activeQuizForQuestions && (
        <Modal title={`Quiz Questions: ${activeQuizForQuestions.title}`} icon={<Eye className="h-5 w-5 text-brand" />} size="max-w-3xl" onClose={() => setActiveQuizForQuestions(null)}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {activeQuizForQuestions.questions?.map((q, idx) => (
              <div key={q._id} className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-3 font-semibold text-foreground"><span className="mr-2 text-brand">Q{idx + 1}.</span><MathRenderer>{q.question}</MathRenderer></p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {q.options?.map((opt, i) => {
                    const isCorrect = opt.trim() === q.correctAnswer?.trim();
                    return (
                      <div key={i} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${isCorrect ? "border-green-500/30 bg-green-500/10 font-semibold text-green-700 dark:text-green-400" : "border-border bg-card"}`}>
                        <span className="shrink-0 font-bold">{String.fromCharCode(65 + i)}.</span>
                        <span className="flex-1"><MathRenderer>{opt}</MathRenderer></span>
                        {isCorrect && <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="mt-3 rounded-lg border border-brand/10 bg-brand-soft/50 p-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Explanation: </span><MathRenderer>{q.explanation}</MathRenderer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ✅ View/Manage Codes Modal */}
      {activeQuizForCodes && (
        <Modal title={`Access Codes: ${activeQuizForCodes.title}`} icon={<Users className="h-5 w-5 text-brand" />} size="max-w-2xl" onClose={() => { setActiveQuizForCodes(null); setNewlyGeneratedCode(""); }}>
          <div className="space-y-4">
            {newlyGeneratedCode && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">New Code Generated!</p>
                </div>
                <p className="font-mono text-2xl font-bold tracking-wider text-foreground mb-2">{newlyGeneratedCode}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(newlyGeneratedCode); alert("Copied to clipboard!"); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-500/30"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Code
                </button>
              </div>
            )}
            
            <div className="max-h-80 overflow-y-auto rounded-xl border border-border bg-muted/30">
              {activeQuizForCodes.accessCodes?.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No codes generated yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {activeQuizForCodes.accessCodes.map((ac, idx) => {
                    const codeStr = typeof ac === 'string' ? ac : ac.code;
                    const isNew = codeStr === newlyGeneratedCode;
                    return (
                      <li key={idx} className={`flex items-center justify-between gap-3 p-3 ${isNew ? 'bg-green-500/5' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold tracking-wider text-foreground">{codeStr}</span>
                          {isNew && <span className="text-xs font-semibold text-green-600">NEW</span>}
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(codeStr); alert("Copied!"); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            
            <button 
              onClick={() => handleAddCode(activeQuizForCodes._id)} 
              disabled={isAddingCode} 
              className={`${primaryBtn} w-full`}
            >
              {isAddingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Generate 1 New Access Code
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}