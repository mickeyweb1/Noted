import React from 'react';
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, FileText, ArrowRight, BarChart3, Clock, User, Users, Trophy, ArrowLeft, Download, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle, Plus, Lightbulb, Loader2, Copy } from "lucide-react";
import api from "../utils/api";

/* ---------- Presentational helpers ---------- */
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const secondaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const th = "px-4 py-3.5 text-left text-sm font-semibold text-muted-foreground sm:px-6";
const td = "px-4 py-4 sm:px-6";

function PageSpinner() {
  return (
    // ✅ FIXED: Changed bg-muted to bg-background for consistency
    <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand"></div>
    </div>
  );
}

function StatCard({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold tabular-nums text-foreground">{children}</p>
      </div>
    </div>
  );
}

const escapeCsvValue = (val) => {
  const str = String(val ?? "");
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatAvgTime = (seconds) => {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
};

/* ---------- Quiz list ---------- */
export function QuizResultsDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchQuizzes(); }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get("/quiz/admin/quizzes");
      setQuizzes(res.data.data);
    } catch (err) { console.error("Failed to fetch quizzes:", err); } 
    finally { setLoading(false); }
  };

  if (loading) return <PageSpinner />;

  return (
    // ✅ FIXED: Changed bg-muted to bg-background
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quiz results</h1>
            <p className="text-muted-foreground">Pick a quiz to see how your students did.</p>
          </div>
          <button onClick={() => navigate("/admin/quizzes")} className={primaryBtn}>
            <Plus className="h-4 w-4" /> New quiz
          </button>
        </div>

        {quizzes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No quizzes yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create a quiz to get access codes for your students. Results will show up here.</p>
            <button onClick={() => navigate("/admin/quizzes")} className={`${primaryBtn} mt-5`}>Go to quiz generator</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <button
                type="button"
                key={quiz._id}
                onClick={() => navigate(`/admin/quiz/${quiz._id}/results`)}
                className={`group block w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-brand hover:shadow-md ${focusRing}`}
              >
                <span className="mb-4 flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><BarChart3 className="h-6 w-6" /></span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand" />
                </span>
                <span className="mb-3 line-clamp-2 block text-lg font-bold text-foreground">{quiz.title}</span>
                <span className="block space-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(quiz.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" />{quiz.numberOfStudents} access codes</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Single quiz results ---------- */
export default function QuizResultsPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  const [quizData, setQuizData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); 
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [regenModal, setRegenModal] = useState({ open: false, step: 'confirm', code: '', loading: false });

  useEffect(() => { fetchResults(); }, [quizId]);

  const fetchResults = async () => {
    setLoading(true);
    setError(""); 
    try {
      const res = await api.get(`/quiz/${quizId}/results`);
      setQuizData(res.data.data.quiz);
      setSubmissions(res.data.data.submissions);
    } catch (err) { 
      setError("Failed to load quiz results. Please check your connection and try again.");
    } finally { 
      setLoading(false); 
    }
  };

  const handleRegenerateCode = () => {
    setRegenModal({ open: true, step: 'confirm', code: '', loading: false });
  };

  const executeRegenerate = async () => {
    setRegenModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.post(`/quiz/${quizId}/regenerate-code`);
      setRegenModal({ open: true, step: 'success', code: res.data.newCode, loading: false });
      fetchResults(); 
    } catch (err) {
      setRegenModal({ open: true, step: 'error', code: '', loading: false });
    }
  };

  const exportToCSV = () => {
    const headers = ["Student Name", "Class", "Score", "Percentage", "Time Taken", "Tab Switches", "Date Submitted"];
    const rows = submissions.map(sub => {
      const percentage = sub.totalQuestions > 0 ? Math.round((sub.score / sub.totalQuestions) * 100) : 0;
      const timeStr = `${Math.floor((sub.timeTaken || 0) / 60)}m ${(sub.timeTaken || 0) % 60}s`;
      
      return [
        `${sub.studentName} ${sub.studentSurname}`, 
        sub.studentClass || "-",
        `${sub.score}/${sub.totalQuestions}`, 
        `${percentage}%`,
        timeStr, 
        sub.tabSwitchCount || 0,
        new Date(sub.submittedAt).toLocaleString()
      ].map(escapeCsvValue);
    });
    
    const csvContent = [headers.map(escapeCsvValue), ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (quizData?.title || "Quiz").replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    a.download = `${safeTitle}-Results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url); 
  };

  if (loading) return <PageSpinner />;

  if (error) {
    return (
      // ✅ FIXED: Changed bg-muted to bg-background
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button onClick={fetchResults} className={`${primaryBtn} mt-5`}>Try again</button>
        </div>
      </div>
    );
  }

  const avgScore = submissions.length > 0 ? Math.round(submissions.reduce((acc, sub) => {
    const p = sub.totalQuestions > 0 ? (sub.score / sub.totalQuestions) * 100 : 0;
    return acc + p;
  }, 0) / submissions.length) : 0;
  
  const avgTimeSeconds = submissions.length > 0 ? Math.round(submissions.reduce((acc, sub) => acc + (sub.timeTaken || 0), 0) / submissions.length) : 0;

  return (
    // ✅ FIXED: Changed bg-muted to bg-background
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate("/admin/quiz-results")} aria-label="Back to all quizzes" className={`shrink-0 rounded-xl border border-border bg-card p-2.5 text-foreground transition hover:bg-accent ${focusRing}`}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold text-foreground">{quizData?.title || "Quiz results"}</h1>
              <p className="text-muted-foreground">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleRegenerateCode} className={secondaryBtn}>
              <RefreshCw className="h-4 w-4" /> Regenerate code
            </button>
            {submissions.length > 0 && (
              <button onClick={exportToCSV} className={primaryBtn}>
                <Download className="h-4 w-4" /> Export CSV
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard icon={User} label="Total students">{submissions.length}</StatCard>
          <StatCard icon={Trophy} label="Average score">{avgScore}%</StatCard>
          <StatCard icon={Clock} label="Average time">{formatAvgTime(avgTimeSeconds)}</StatCard>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {submissions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th scope="col" className={th}>Student</th>
                    <th scope="col" className={th}>Score</th>
                    <th scope="col" className={th}>Percentage</th>
                    <th scope="col" className={th}>Time</th>
                    <th scope="col" className={th}>Tab switches</th>
                    <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.map((sub, idx) => {
                    const percentage = sub.totalQuestions > 0 ? Math.round((sub.score / sub.totalQuestions) * 100) : 0;
                    const isExpanded = expandedSubmission === sub._id;
                    const tone =
                      percentage >= 70
                        ? { badge: "bg-green-500/10 text-green-700 dark:text-green-400", bar: "bg-green-500" }
                        : percentage >= 50
                        ? { badge: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", bar: "bg-yellow-500" }
                        : { badge: "bg-destructive/10 text-destructive", bar: "bg-destructive" };
                    return (
                      <React.Fragment key={idx}>
                        <tr className={`transition-colors hover:bg-muted/50 ${isExpanded ? "bg-muted/50" : ""}`}>
                          <td className={td}>
                            <div className="font-medium text-foreground">{sub.studentName} {sub.studentSurname}</div>
                            <div className="text-xs text-muted-foreground">{sub.studentClass || "No class"}</div>
                          </td>
                          <td className={`${td} font-bold tabular-nums text-foreground`}>{sub.score}/{sub.totalQuestions}</td>
                          <td className={td}>
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percentage}%` }} />
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone.badge}`}>{percentage}%</span>
                            </div>
                          </td>
                          <td className={`${td} text-sm tabular-nums text-muted-foreground`}>{Math.floor((sub.timeTaken || 0) / 60)}m {(sub.timeTaken || 0) % 60}s</td>
                          <td className={td}>
                            {sub.tabSwitchCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-sm font-medium text-destructive"><AlertTriangle className="h-3 w-3" /> {sub.tabSwitchCount}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className={`${td} text-right`}>
                            <button
                              onClick={() => setExpandedSubmission(isExpanded ? null : sub._id)}
                              aria-expanded={isExpanded}
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-brand transition hover:bg-brand-soft ${focusRing}`}
                            >
                              {isExpanded ? 'Hide answers' : 'View answers'} {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="6" className="bg-muted/30 p-4 sm:p-6">
                              <div className="space-y-4">
                                <h4 className="font-semibold text-foreground">Question breakdown</h4>
                                {sub.answers.map((ans, aIdx) => {
                                  const question = quizData?.questions.find(q => q._id === ans.questionId);
                                  if (!question) {
                                    return (
                                      <div key={aIdx} className="rounded-xl border border-dashed border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                                        Question data missing for answer #{aIdx + 1}.
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={aIdx} className="rounded-xl border border-border bg-card p-4">
                                      <div className="mb-3 flex items-start gap-3">
                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ans.isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>{aIdx + 1}</span>
                                        <p className="min-w-0 break-words pt-0.5 font-medium text-foreground">{question.question}</p>
                                      </div>
                                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                                        <div className={`rounded-lg border p-3 ${ans.isCorrect ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
                                          <span className="mb-1 block text-xs font-semibold">Student answer</span>
                                          <span className="flex items-start gap-2">
                                            <span className={`min-w-0 flex-1 break-words ${ans.selectedAnswer ? "" : "italic"}`}>{ans.selectedAnswer || "Skipped"}</span>
                                            {ans.isCorrect ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                                          </span>
                                        </div>
                                        {!ans.isCorrect && (
                                          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-700 dark:text-green-400">
                                            <span className="mb-1 block text-xs font-semibold">Correct answer</span>
                                            <span className="flex items-start gap-2">
                                              <span className="min-w-0 flex-1 break-words">{question.correctAnswer}</span>
                                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      {question.explanation && (
                                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand-soft p-3 text-sm text-foreground">
                                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                                          <p><span className="font-semibold">Explanation:</span> {question.explanation}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {submissions.length === 0 && (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <BarChart3 className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-foreground">No submissions yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Share the access codes with your students. Their results will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {regenModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {regenModal.step === 'confirm' && (
              <>
                <h3 className="text-lg font-bold text-foreground mb-2">Generate new code?</h3>
                <p className="text-sm text-muted-foreground mb-6">This will create one new access code for this quiz. Students who already took the quiz won't be affected.</p>
                <div className="flex gap-3">
                  <button onClick={() => setRegenModal({ open: false, step: 'confirm', code: '', loading: false })} className={`${secondaryBtn} flex-1`}>Cancel</button>
                  <button onClick={executeRegenerate} disabled={regenModal.loading} className={`${primaryBtn} flex-1`}>
                    {regenModal.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Generate
                  </button>
                </div>
              </>
            )}
            {regenModal.step === 'success' && (
              <>
                <h3 className="text-lg font-bold text-foreground mb-2">New code generated!</h3>
                <p className="text-sm text-muted-foreground mb-4">Share this code with your student:</p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-3 mb-6">
                  <span className="flex-1 font-mono text-lg font-bold tracking-wider text-foreground break-all">{regenModal.code}</span>
                  <button onClick={() => navigator.clipboard.writeText(regenModal.code)} className="shrink-0 rounded-lg bg-brand p-2 text-brand-foreground hover:bg-brand/90 transition" title="Copy code">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <button onClick={() => setRegenModal({ open: false, step: 'confirm', code: '', loading: false })} className={`${primaryBtn} w-full`}>Done</button>
              </>
            )}
            {regenModal.step === 'error' && (
              <>
                <h3 className="text-lg font-bold text-foreground mb-2">Failed to generate code</h3>
                <p className="text-sm text-muted-foreground mb-6">Something went wrong. Please try again.</p>
                <button onClick={() => setRegenModal({ open: false, step: 'confirm', code: '', loading: false })} className={`${primaryBtn} w-full`}>Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
