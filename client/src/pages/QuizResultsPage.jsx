import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar, FileText, ArrowRight, BarChart3, Clock, User, Users, Trophy, ArrowLeft, Download, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertTriangle, Plus, Lightbulb, Loader2, Copy, Check, Award, Eye, Search, Trash2, RefreshCw, Target, Flag,
} from "lucide-react";
import api from "../utils/api";
import Modal from "../components/Modal";
import { useClipboard } from "../components/QuizFormKit";
import MathRenderer from "../components/MathRenderer";

/* ---------- Styles ---------- */
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const secondaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const inputCls = `w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3.5 text-base text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand sm:text-sm ${focusRing}`;
const th = "px-4 py-3.5 text-left text-sm font-semibold text-muted-foreground sm:px-6";
const td = "px-4 py-4 sm:px-6";
const TEAM_STYLES = [
  { name: "Team 1", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", soft: "bg-rose-500/10", border: "border-rose-500/30" },
  { name: "Team 2", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", soft: "bg-sky-500/10", border: "border-sky-500/30" },
];
const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "high", label: "Highest score" },
  { id: "low", label: "Lowest score" },
  { id: "name", label: "Name (A to Z)" },
  { id: "tabs", label: "Most tab switches" },
];

/* ---------- Helpers ---------- */
const formatDuration = (seconds) => {
  const total = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m === 0 ? `${s}s` : `${m}m ${s}s`;
};
const formatDate = (value) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(); };
const escapeCsvValue = (val) => {
  let str = String(val ?? "");
  if (typeof val === "string" && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return /[",\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// Game shows score in points. If an old submission has no maxScore, work it out from the quiz.
const maxScoreOf = (sub, isGameShow, quiz) => {
  if (!isGameShow) return sub.totalQuestions || 0;
  if (sub.maxScore) return sub.maxScore;
  return (quiz?.questions?.length || sub.totalQuestions || 0) * (quiz?.baseMarks || 10);
};
const rawPercent = (sub, isGameShow, quiz) => {
  const max = maxScoreOf(sub, isGameShow, quiz);
  return max > 0 ? Math.min(100, (sub.score / max) * 100) : 0;
};
const fullName = (sub) => `${sub.studentName ?? ""} ${sub.studentSurname ?? ""}`.trim();
const toneFor = (pct) =>
  pct >= 70 ? { badge: "bg-green-500/10 text-green-700 dark:text-green-400", bar: "bg-green-500" }
  : pct >= 50 ? { badge: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", bar: "bg-yellow-500" }
  : { badge: "bg-destructive/10 text-destructive", bar: "bg-destructive" };

/* ---------- Small components ---------- */
function PageSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-dvh items-center justify-center bg-background">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand" />
    </div>
  );
}

function StatCard({ icon: Icon, label, hint, children }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:gap-4 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand sm:h-11 sm:w-11"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{children}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon className="h-7 w-7" /></div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle className="h-7 w-7" /></div>
        <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <button onClick={onRetry} className={`${primaryBtn} mt-5`}>Try again</button>
      </div>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder, label }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}

function TabSwitchBadge({ count }) {
  if (!count) return <span className="text-sm text-muted-foreground">0</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-sm font-medium text-destructive">
      <AlertTriangle className="h-3 w-3" /> {count}
    </span>
  );
}

function QuizCard({ quiz, onResults, onResume, onDelete, canDelete = true, teacherName }) {
  const isGameShow = quiz.gameMode === "gameShow";
  const resumeCode = quiz.accessCodes?.[0];

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-brand/40 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isGameShow ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-brand-soft text-brand"}`}>
          {isGameShow ? <Trophy className="h-6 w-6" /> : <BarChart3 className="h-6 w-6" />}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isGameShow ? "bg-purple-500/10 text-purple-700 dark:text-purple-400" : "bg-muted text-muted-foreground"}`}>
          {isGameShow ? "Game show" : "Quiz"}
        </span>
      </div>
      <h3 className="mb-1 line-clamp-2 break-words text-lg font-bold text-foreground" title={quiz.title}>{quiz.title}</h3>
      {!canDelete && teacherName && <p className="mb-3 truncate text-xs text-muted-foreground">Created by {teacherName}</p>}

      <div className="mb-5 mt-2 space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" />{formatDate(quiz.createdAt)}</p>
        <p className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0" />{quiz.numberOfStudents} access codes</p>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button onClick={onResults} className={`${primaryBtn} w-full`}>View results <ArrowRight className="h-4 w-4" /></button>
        {isGameShow && resumeCode && (
          <button onClick={() => onResume(resumeCode)} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-background px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-500/10 dark:text-purple-400 ${focusRing}`}>
            <Trophy className="h-4 w-4" /> Resume live match
          </button>
        )}
        {canDelete && (
          <button onClick={() => onDelete(quiz)} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-background px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10 ${focusRing}`}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>
    </article>
  );
}

/* ================= All quizzes ================= */
export function QuizResultsDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [hasTeacherSection, setHasTeacherSection] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/quiz/admin/quizzes");
      setQuizzes(res.data.data ?? []);
      setHasTeacherSection(res.data.hasTeacherSection ?? false);
    } catch {
      setError("Couldn't load your quizzes.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/quiz/${toDelete._id}`);
      setQuizzes((prev) => prev.filter((q) => q._id !== toDelete._id));
      setToDelete(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete the quiz. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const counts = useMemo(() => {
    const gameShows = quizzes.filter((q) => q.gameMode === "gameShow").length;
    return { all: quizzes.length, gameShow: gameShows, quiz: quizzes.length - gameShows };
  }, [quizzes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quizzes
      .filter((z) => filter === "all" || (filter === "gameShow") === (z.gameMode === "gameShow"))
      .filter((z) => !q || (z.title ?? "").toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [quizzes, query, filter]);

  const ownerQuizzes = hasTeacherSection ? visible.filter((q) => q.isOwnerQuiz) : visible;
  const teacherQuizzes = hasTeacherSection ? visible.filter((q) => !q.isOwnerQuiz) : [];

  if (loading) return <PageSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchQuizzes} />;

  const chips = [{ id: "all", label: "All" }, { id: "quiz", label: "Quizzes" }, { id: "gameShow", label: "Game shows" }];
  const renderCard = (quiz, isOwn) => (
    <QuizCard
      key={quiz._id}
      quiz={quiz}
      canDelete={isOwn}
      teacherName={quiz.teacherName}
      onResults={() => navigate(`/admin/quiz/${quiz._id}/results`)}
      onResume={(code) => navigate(`/game-show?code=${code}`)}
      onDelete={(q) => { setDeleteError(""); setToDelete(q); }}
    />
  );

  return (
    <div className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Quiz results</h1>
            <p className="text-muted-foreground">Pick a quiz to see how your students did.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate("/admin/quizzes")} className={secondaryBtn}><Plus className="h-4 w-4" /> New quiz</button>
            <button onClick={() => navigate("/admin/game-show-creator")} className={primaryBtn}><Trophy className="h-4 w-4" /> New game show</button>
          </div>
        </div>

        {quizzes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <EmptyState icon={FileText} title="No quizzes yet" action={<button onClick={() => navigate("/admin/quizzes")} className={`${primaryBtn} mt-5`}>Create your first quiz</button>}>
              Create a quiz or game show to get started.
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput value={query} onChange={setQuery} placeholder="Search by title" label="Search quizzes" />
              <div role="group" aria-label="Filter by type" className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
                {chips.map((c) => (
                  <button key={c.id} onClick={() => setFilter(c.id)} aria-pressed={filter === c.id} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${focusRing} ${filter === c.id ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {c.label} <span className="tabular-nums opacity-70">{counts[c.id]}</span>
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card shadow-sm"><EmptyState icon={Search} title="Nothing matches">Try a different search or filter.</EmptyState></div>
            ) : (
              <div className="space-y-8">
                {ownerQuizzes.length > 0 && (
                  <section>
                    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground"><FileText className="h-5 w-5 text-brand" /> {hasTeacherSection ? "My quizzes" : "Your quizzes"}</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{ownerQuizzes.map((q) => renderCard(q, true))}</div>
                  </section>
                )}
                {hasTeacherSection && teacherQuizzes.length > 0 && (
                  <section>
                    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground"><Users className="h-5 w-5 text-purple-600" /> Teacher quizzes</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{teacherQuizzes.map((q) => renderCard(q, false))}</div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {toDelete && (
        <Modal title="Delete this quiz?" onClose={() => !isDeleting && setToDelete(null)} size="max-w-md">
          <p className="mb-1 break-words text-sm font-semibold text-foreground">{toDelete.title}</p>
          <p className="mb-4 text-sm text-muted-foreground">This permanently removes the quiz and all student submissions. It can't be undone.</p>
          {deleteError && <p role="alert" className="mb-3 text-sm text-destructive">{deleteError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button onClick={() => setToDelete(null)} disabled={isDeleting} className={`${secondaryBtn} flex-1`}>Cancel</button>
            <button onClick={confirmDelete} disabled={isDeleting} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-destructive/90 disabled:opacity-60 ${focusRing}`}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= One quiz ================= */
function SubmissionBreakdown({ sub, questionById }) {
  const answers = sub.answers ?? [];
  if (answers.length === 0) return <p className="text-sm text-muted-foreground">No answer details were saved.</p>;
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-foreground">Question breakdown</h4>
      {answers.map((ans, aIdx) => {
        const question = questionById.get(String(ans.questionId));
        if (!question) {
          return <div key={aIdx} className="rounded-xl border border-dashed border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">Question data is missing for answer {aIdx + 1}.</div>;
        }
        return (
          <div key={aIdx} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-start gap-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ans.isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>{aIdx + 1}</span>
              <p className="min-w-0 break-words pt-0.5 font-medium text-foreground"><MathRenderer>{question.question}</MathRenderer></p>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div className={`rounded-lg border p-3 ${ans.isCorrect ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                <span className="mb-1 block text-xs font-semibold">Student answer</span>
                <span className="flex items-start gap-2">
                  <span className={`min-w-0 flex-1 break-words ${ans.selectedAnswer ? "" : "italic"}`}><MathRenderer>{ans.selectedAnswer || "Skipped"}</MathRenderer></span>
                  {ans.isCorrect ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                </span>
              </div>
              {!ans.isCorrect && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-700 dark:text-green-400">
                  <span className="mb-1 block text-xs font-semibold">Correct answer</span>
                  <span className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 break-words"><MathRenderer>{question.correctAnswer}</MathRenderer></span>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  </span>
                </div>
              )}
            </div>
            {question.explanation && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand-soft p-3 text-sm text-foreground">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <p className="min-w-0 break-words"><span className="font-semibold">Explanation:</span> <MathRenderer>{question.explanation}</MathRenderer></p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

  const getDaysRemaining = (expiresAt) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days` : "Expired";
  };

export default function QuizResultsPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { copy, copiedKey } = useClipboard();

  const [quizData, setQuizData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
    const [showCodeHistory, setShowCodeHistory] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
    const [showCodesModal, setShowCodesModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [regen, setRegen] = useState({ step: null, code: "" });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const requestRef = useRef(0);

  const fetchResults = useCallback(async ({ silent = false } = {}) => {
    const requestId = ++requestRef.current;
    if (silent) setRefreshing(true);
    else { setLoading(true); setError(""); }
    try {
      const res = await api.get(`/quiz/${quizId}/results`);
      if (requestId !== requestRef.current) return;
      setQuizData(res.data.data.quiz);
      setSubmissions(res.data.data.submissions ?? []);
      setLastUpdated(new Date());
    } catch {
      if (requestId !== requestRef.current) return;
      if (!silent) setError("Failed to load quiz results.");
    } finally {
      if (requestId === requestRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [quizId]);
  useEffect(() => { fetchResults(); }, [fetchResults]);

  const isGameShow = quizData?.gameMode === "gameShow";
  const questionById = useMemo(() => new Map((quizData?.questions ?? []).map((q) => [String(q._id), q])), [quizData]);

  const visibleSubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = submissions.filter((s) => !q || `${fullName(s)} ${s.studentClass ?? ""}`.toLowerCase().includes(q));
    const pct = (s) => rawPercent(s, isGameShow, quizData);
    const sorters = {
      newest: (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
      high: (a, b) => pct(b) - pct(a),
      low: (a, b) => pct(a) - pct(b),
      name: (a, b) => fullName(a).localeCompare(fullName(b)),
      tabs: (a, b) => (b.tabSwitchCount || 0) - (a.tabSwitchCount || 0),
    };
    return [...list].sort(sorters[sortKey]);
  }, [submissions, query, sortKey, isGameShow, quizData]);

  const standings = useMemo(() => {
    if (!isGameShow) return [];
    const sorted = [...submissions].sort((a, b) => b.score - a.score);
    return sorted.slice(0, 2).map((sub) => ({ sub, rank: 1 + sorted.filter((s) => s.score > sub.score).length }));
  }, [submissions, isGameShow]);

  const analysis = useMemo(() => {
    const n = submissions.length;
    const pcts = submissions.map((s) => rawPercent(s, isGameShow, quizData));
    const timed = submissions.filter((s) => s.timeTaken > 0);
    const buckets = [
      { label: "85–100%", count: pcts.filter((p) => p >= 85).length, bar: "bg-green-500" },
      { label: "70–84%", count: pcts.filter((p) => p >= 70 && p < 85).length, bar: "bg-lime-500" },
      { label: "50–69%", count: pcts.filter((p) => p >= 50 && p < 70).length, bar: "bg-yellow-500" },
      { label: "Below 50%", count: pcts.filter((p) => p < 50).length, bar: "bg-destructive" },
    ];
    const perQuestion = (quizData?.questions ?? []).map((q, index) => {
      const responses = submissions.map((s) => s.answers?.find((x) => String(x.questionId) === String(q._id)));
      const answered = responses.filter((answer) => typeof answer?.selectedAnswer === "string" && answer.selectedAnswer.trim());
      const correct = responses.filter((answer) => answer?.isCorrect).length;
      const confidentMisses = responses.filter((answer) => answer?.confidence === "high" && !answer.isCorrect).length;
      const lowConfidenceCorrect = responses.filter((answer) => ["low", "medium"].includes(answer?.confidence) && answer.isCorrect).length;
      const wrongChoices = new Map();
      answered.filter((answer) => !answer.isCorrect).forEach((answer) => {
        wrongChoices.set(answer.selectedAnswer, (wrongChoices.get(answer.selectedAnswer) || 0) + 1);
      });
      const topDistractorEntry = [...wrongChoices.entries()].sort((a, b) => b[1] - a[1])[0];
      const topDistractor = topDistractorEntry ? { answer: topDistractorEntry[0], count: topDistractorEntry[1] } : null;
      const total = submissions.length;
      const skipped = total - answered.length;
      return {
        index,
        question: q,
        total,
        answered: answered.length,
        correct,
        confidentMisses,
        lowConfidenceCorrect,
        skipped,
        pct: total ? Math.round((correct / total) * 100) : null,
        skipPct: total ? Math.round((skipped / total) * 100) : 0,
        distractorPct: answered.length && topDistractor ? Math.round((topDistractor.count / answered.length) * 100) : 0,
        topDistractor,
      };
    });
    const qualityFlags = perQuestion.flatMap((question) => {
      if (question.total < 3) return [];
      if (question.skipPct >= 25) return [{ ...question, signal: "High skip rate", message: `${question.skipped} of ${question.total} students left this blank. Check the wording, prerequisites, or time pressure.` }];
      if (question.pct <= 40) return [{ ...question, signal: "Low correct rate", message: `Only ${question.pct}% of the class got this right. Review the wording and related lesson coverage.` }];
      if (question.topDistractor?.count >= 2 && question.distractorPct >= 35) {
        return [{ ...question, signal: "Repeated wrong choice", message: `${question.topDistractor.count} students chose the same incorrect option. This may point to a common misconception or a distractor worth reviewing.` }];
      }
      if (question.confidentMisses >= 2) {
        return [{ ...question, signal: "Confident mistakes", message: `${question.confidentMisses} students were very sure but chose an incorrect answer. Revisit the concept and check whether the distractors reveal a shared misconception.` }];
      }
      if (question.lowConfidenceCorrect >= 2) {
        return [{ ...question, signal: "Correct, but unsure", message: `${question.lowConfidenceCorrect} students got this right while feeling unsure. A brief recap could help build confidence.` }];
      }
      return [];
    });
    const topicGroups = new Map();
    (quizData?.questions ?? []).forEach((question) => {
      const topic = typeof question.topic === "string" ? question.topic.trim() : "";
      if (!topic) return;
      const key = topic.toLocaleLowerCase();
      if (!topicGroups.has(key)) topicGroups.set(key, { topic, questionCount: 0, total: 0, correct: 0, skipped: 0 });
      const group = topicGroups.get(key);
      group.questionCount++;
      submissions.forEach((submission) => {
        const answer = submission.answers?.find((item) => String(item.questionId) === String(question._id));
        group.total++;
        if (answer?.isCorrect) group.correct++;
        if (!answer?.selectedAnswer?.trim()) group.skipped++;
      });
    });
    const topicMastery = [...topicGroups.values()].map((group) => ({
      ...group,
      pct: group.total ? Math.round((group.correct / group.total) * 100) : 0,
      studentCount: n,
    }));
    return {
      count: n,
      avgScore: n ? Math.round(pcts.reduce((a, b) => a + b, 0) / n) : 0,
      passRate: n ? Math.round((pcts.filter((p) => p >= (quizData?.passMark ?? 50)).length / n) * 100) : 0,
      avgTime: timed.length ? Math.round(timed.reduce((a, s) => a + s.timeTaken, 0) / timed.length) : 0,
      flagged: submissions.filter((s) => (s.tabSwitchCount || 0) > 0).length,
      buckets,
      perQuestion,
      qualityFlags,
      topicMastery,
    };
  }, [submissions, quizData, isGameShow]);

  const closeRegen = () => { if (!isRegenerating) setRegen({ step: null, code: "" }); };
  const executeRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await api.post(`/quiz/${quizId}/regenerate-code`);
      setRegen({ step: "success", code: res.data.newCode });
      fetchResults({ silent: true });
    } catch (err) {
      setRegen({ step: "error", code: "", message: err.response?.data?.message });
    } finally {
      setIsRegenerating(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Student name", "Class", "Score", "Max score", "Percentage", "Time taken", "Tab switches", "Date submitted"];
    const rows = submissions.map((sub) => [
      fullName(sub), sub.studentClass || "-", sub.score, maxScoreOf(sub, isGameShow, quizData),
      `${Math.round(rawPercent(sub, isGameShow, quizData))}%`, sub.timeTaken ? formatDuration(sub.timeTaken) : "-",
      sub.tabSwitchCount || 0, new Date(sub.submittedAt).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(quizData?.title || "Quiz").replace(/[^a-z0-9]/gi, "_").substring(0, 50)}-Results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <PageSpinner />;
  if (error) return <ErrorState message={error} onRetry={() => fetchResults()} />;

  const { count, avgScore, passRate, avgTime, flagged, buckets, perQuestion, qualityFlags, topicMastery } = analysis;
  const codes = quizData?.accessCodes ?? [];
  const questions = quizData?.questions ?? [];
  const isTie = standings.length === 2 && standings[0].rank === standings[1].rank;
  const rowKey = (sub, idx) => sub._id ?? `row-${idx}`;

  return (
    <div className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate("/admin/quiz-results")} aria-label="Back to all quizzes" className={`shrink-0 rounded-xl border border-border bg-card p-2.5 text-foreground transition hover:bg-accent ${focusRing}`}><ArrowLeft className="h-5 w-5" /></button>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{quizData?.title || "Quiz results"}</h1>
              <p className="text-sm text-muted-foreground">
                {count} submission{count !== 1 ? "s" : ""}
                {lastUpdated && <span className="hidden sm:inline"> · updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fetchResults({ silent: true })} disabled={refreshing} aria-label="Refresh results" className={`${secondaryBtn} px-3`}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /></button>
            <button onClick={() => setShowQuestions(true)} className={secondaryBtn}><Eye className="h-4 w-4" /> Questions</button>
             <button onClick={() => setShowCodesModal(true)} className={secondaryBtn}>
              <Clock className="h-4 w-4" /> View Codes
            </button>
            <button onClick={() => setRegen({ step: "confirm", code: "" })} className={secondaryBtn}><Plus className="h-4 w-4" /> Add code</button>
            {count > 0 && <button onClick={exportToCSV} className={primaryBtn}><Download className="h-4 w-4" /> Export CSV</button>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={User} label="Students">{count}</StatCard>
          <StatCard icon={Trophy} label="Average score">{avgScore}%</StatCard>
          {isGameShow
            ? <StatCard icon={FileText} label="Questions">{questions.length}</StatCard>
            : <StatCard icon={Clock} label="Average time">{avgTime ? formatDuration(avgTime) : "—"}</StatCard>}
        </div>

                {/* ✅ NEW: Access Code History Section */}
        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <button 
            onClick={() => setShowCodeHistory(!showCodeHistory)} 
            className={`flex w-full items-center justify-between gap-3 rounded-2xl p-5 text-left sm:p-6 ${focusRing}`}
          >
            <span className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Clock className="h-5 w-5 text-brand" /> Manage Access Codes
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {showCodeHistory ? "Hide" : "Show"} {showCodeHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
            <span className="ml-auto rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
              {quizData?.accessCodeHistory?.length || 0} Codes
            </span>
          </button>

          {showCodeHistory && (
            <div className="border-t border-border p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Codes automatically expire 30 days after generation. Students cannot use expired codes.
                </p>
                <button 
                  onClick={async () => {
                    setIsGeneratingCode(true);
                    try {
                      await api.post(`/quiz/${quizId}/regenerate-code`);
                      fetchResults({ silent: true }); // Refresh the list
                    } catch (err) {
                      alert(err.response?.data?.message || "Failed to generate code");
                    } finally {
                      setIsGeneratingCode(false);
                    }
                  }}
                  disabled={isGeneratingCode}
                  className={`${primaryBtn} py-2`}
                >
                  {isGeneratingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Generate 1 New Code
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-muted/30">
                {quizData?.accessCodeHistory?.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">No codes generated yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {quizData.accessCodeHistory.map((ac, idx) => {
                      const daysLeft = getDaysRemaining(ac.expiresAt);
                      const isExpired = daysLeft === "Expired";
                      return (
                        <li key={idx} className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
                          <div className="min-w-0 flex-1">
                            <p className={`font-mono text-base font-bold tracking-wider ${isExpired ? "text-destructive line-through" : "text-foreground"}`}>
                              {ac.code}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Generated: {new Date(ac.createdAt).toLocaleDateString()} 
                              <span className={`ml-2 font-semibold ${isExpired ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                                • {isExpired ? "Expired" : `Expires in ${daysLeft}`}
                              </span>
                            </p>
                          </div>
                          {!isExpired && (
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(ac.code);
                                alert("Code copied!");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                            >
                              <Copy className="h-3.5 w-3.5" /> Copy
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Students who switched tabs */}
        {!isGameShow && flagged > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <Flag className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span><strong>{flagged}</strong> student{flagged !== 1 ? "s" : ""} switched tabs or left the page during this quiz.</span>
            </p>
            <button onClick={() => { setSortKey("tabs"); document.getElementById("submissions")?.scrollIntoView({ behavior: "smooth" }); }} className={`${secondaryBtn} py-2`}>Show them first</button>
          </div>
        )}

        {/* Score spread */}
        {!isGameShow && count > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground"><BarChart3 className="h-5 w-5 text-brand" /> Score spread</h2>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Distribution of student scores">
              {buckets.map((b) => b.count > 0 && <div key={b.label} className={b.bar} style={{ width: `${(b.count / count) * 100}%` }} title={`${b.label}: ${b.count}`} />)}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              {buckets.map((b) => (
                <li key={b.label} className="flex items-center gap-2 text-muted-foreground">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${b.bar}`} aria-hidden="true" />
                  <span className="truncate">{b.label}</span>
                  <span className="ml-auto font-semibold tabular-nums text-foreground">{b.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Question quality insights */}
        {!isGameShow && count > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="question-quality-title">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Lightbulb className="h-5 w-5" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <h2 id="question-quality-title" className="text-lg font-bold text-foreground">Question quality insights</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Response patterns can help you spot questions to review. These are prompts, not proof that a question is flawed; patterns appear after at least 3 submissions.</p>
              </div>
            </div>

            {qualityFlags.length === 0 ? (
              <p className="mt-4 rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
                No questions meet the current review signals yet. As more students submit, this section will highlight high skip rates, low correct rates, or repeated wrong choices.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {qualityFlags.map((question) => (
                  <li key={question.index} className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">Question {question.index + 1} · {question.signal}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{question.correct}/{question.total} correct · {question.skipped} skipped</span>
                    </div>
                    <p className="mt-2 break-words text-sm font-medium leading-6 text-foreground"><MathRenderer>{question.question.question}</MathRenderer></p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.message}</p>
                    {question.signal === "Repeated wrong choice" && question.topDistractor && (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">Most common incorrect answer: <span className="font-semibold text-foreground"><MathRenderer>{question.topDistractor.answer}</MathRenderer></span></p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button type="button" onClick={() => { setShowAnalysis(true); document.getElementById("question-analysis")?.scrollIntoView({ behavior: "smooth" }); }} className={`${secondaryBtn} mt-4 w-full sm:w-auto`}>
              See response rates by question <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        )}

        {!isGameShow && count > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="class-mastery-title">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Users className="h-5 w-5" aria-hidden="true" /></div>
              
            </div>
            {topicMastery.filter((topic) => topic.studentCount >= 3).length === 0 ? (
              <p className="mt-4 rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
                No topic groups to show yet. Add topic labels to questions when creating a quiz, then collect at least 3 submissions to see class-level patterns here.
              </p>
            ) : (
              <ul className="mt-5 space-y-4">
                {topicMastery.filter((topic) => topic.studentCount >= 3).map((topic) => {
                  const barColor = topic.pct >= 80 ? "bg-green-500" : topic.pct >= 50 ? "bg-yellow-500" : "bg-destructive";
                  const masteryLabel = topic.pct >= 80 ? "Strong" : topic.pct >= 50 ? "Developing" : "Needs review";
                  return (
                    <li key={topic.topic} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{topic.topic}</p>
                          <p className="text-xs text-muted-foreground">{topic.questionCount} question{topic.questionCount === 1 ? "" : "s"} · {topic.studentCount} submissions</p>
                        </div>
                        <span className="text-right"><span className="block text-lg font-bold tabular-nums text-foreground">{topic.pct}%</span><span className="text-xs text-muted-foreground">{masteryLabel}</span></span>
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${topic.topic}: ${topic.pct}% correct`}>
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${topic.pct}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{topic.correct} correct · {topic.skipped} unanswered across the topic questions</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Question analysis */}
        {!isGameShow && count > 0 && (
          <section id="question-analysis" className="scroll-mt-4 rounded-2xl border border-border bg-card shadow-sm">
            <button onClick={() => setShowAnalysis((v) => !v)} aria-expanded={showAnalysis} className={`flex w-full items-center justify-between gap-3 rounded-2xl p-5 text-left sm:p-6 ${focusRing}`}>
              <span className="flex items-center gap-2 text-lg font-bold text-foreground"><Target className="h-5 w-5 text-brand" /> Question analysis</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">{showAnalysis ? "Hide" : "Show"} {showAnalysis ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
            </button>
            {showAnalysis && (
              <ul className="space-y-3 border-t border-border p-5 sm:p-6">
                {perQuestion.map((pq) => {
                  const tone = pq.pct === null ? null : toneFor(pq.pct);
                  return (
                    <li key={pq.index} className="min-w-0">
                      <div className="mb-1 flex items-start justify-between gap-3 text-sm">
                        <p className="min-w-0 flex-1 truncate text-foreground"><span className="mr-1.5 font-bold text-brand">Q{pq.index + 1}</span><span className="text-muted-foreground">{pq.question.question.replace(/\$/g, "")}</span></p>
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">{pq.pct === null ? "—" : `${pq.pct}%`}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        {tone && <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pq.pct}%` }} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Game show: codes + standings */}
        {isGameShow && codes.length >= 2 && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-foreground"><Users className="h-5 w-5 text-brand" /> Access codes</h2>
            <p className="mb-4 text-sm text-muted-foreground">If a student loses their code, you can give it to them again from here.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {codes.slice(0, 2).map((code, i) => {
                const t = TEAM_STYLES[i];
                return (
                  <div key={i} className={`flex items-center justify-between gap-3 rounded-xl border-2 p-4 ${t.border} ${t.soft}`}>
                    <div className="min-w-0">
                      <p className={`mb-1 flex items-center gap-2 text-sm font-semibold ${t.text}`}><span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} aria-hidden="true" />{t.name} code</p>
                      <p className="break-all font-mono text-xl font-bold tracking-wider text-foreground sm:text-2xl">{code}</p>
                    </div>
                    <button onClick={() => copy(code, `team-${i}`)} aria-label={`Copy ${t.name} code`} className={`shrink-0 rounded-lg border border-border bg-background p-3 text-foreground transition hover:bg-accent ${focusRing}`}>
                      {copiedKey === `team-${i}` ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {isGameShow && standings.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground"><Award className="h-5 w-5 text-brand" /> Final standings</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {standings.map(({ sub, rank }) => {
                const first = rank === 1;
                const label = first ? (isTie ? "Tied for first" : "First place") : "Second place";
                const max = maxScoreOf(sub, true, quizData);
                return (
                  <div key={sub._id ?? fullName(sub)} className={`flex items-center gap-4 rounded-xl border p-4 ${first ? "border-yellow-500/20 bg-yellow-500/10" : "border-gray-400/20 bg-gray-400/10"}`}>
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow ${first ? "bg-yellow-500" : "bg-gray-400"}`}>{rank}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">{label}</p>
                      <p className="truncate text-xl font-bold text-foreground">{fullName(sub)}</p>
                      <p className={`text-lg font-bold tabular-nums ${first ? "text-yellow-700 dark:text-yellow-500" : "text-muted-foreground"}`}>{sub.score}{max ? ` / ${max}` : ""} points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Submissions */}
        <section id="submissions" className="scroll-mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {count === 0 ? (
            <EmptyState icon={BarChart3} title="No submissions yet">Share the access codes with your students. Results appear here as they finish.</EmptyState>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
                <SearchInput value={query} onChange={setQuery} placeholder="Search by name or class" label="Search students" />
                <div className="relative">
                  <select aria-label="Sort submissions" value={sortKey} onChange={(e) => setSortKey(e.target.value)} className={`w-full appearance-none rounded-xl border border-input bg-background py-2.5 pl-3.5 pr-9 text-base text-foreground sm:w-48 sm:text-sm ${focusRing}`}>
                    {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {visibleSubs.length === 0 ? (
                <EmptyState icon={Search} title="No students match">Try a different name or class.</EmptyState>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full">
                      <thead className="border-b border-border bg-muted/50">
                        <tr>
                          <th scope="col" className={th}>Student</th>
                          <th scope="col" className={th}>{isGameShow ? "Points" : "Score"}</th>
                          <th scope="col" className={th}>Percentage</th>
                          <th scope="col" className={th}>Time</th>
                          <th scope="col" className={th}>Tab switches</th>
                          <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {visibleSubs.map((sub, idx) => {
                          const key = rowKey(sub, idx);
                          const open = expandedKey === key;
                          const percentage = Math.round(rawPercent(sub, isGameShow, quizData));
                          const tone = toneFor(percentage);
                          return (
                            <Fragment key={key}>
                              <tr className={`transition-colors hover:bg-muted/50 ${open ? "bg-muted/50" : ""}`}>
                                <td className={td}>
                                  <div className="font-medium text-foreground">{fullName(sub)}</div>
                                  <div className="text-xs text-muted-foreground">{sub.studentClass || "No class"}</div>
                                </td>
                                <td className={`${td} font-bold tabular-nums text-foreground`}>{sub.score}/{maxScoreOf(sub, isGameShow, quizData)}</td>
                                <td className={td}>
                                  <div className="flex items-center gap-3">
                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percentage}%` }} /></div>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone.badge}`}>{percentage}%</span>
                                  </div>
                                </td>
                                <td className={`${td} text-sm tabular-nums text-muted-foreground`}>{sub.timeTaken ? formatDuration(sub.timeTaken) : "—"}</td>
                                <td className={td}>{isGameShow ? <span className="text-sm text-muted-foreground">—</span> : <TabSwitchBadge count={sub.tabSwitchCount} />}</td>
                                <td className={`${td} text-right`}>
                                  <button onClick={() => setExpandedKey(open ? null : key)} aria-expanded={open} aria-controls={`details-${key}`} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-brand transition hover:bg-brand-soft ${focusRing}`}>
                                    {open ? "Hide answers" : "View answers"} {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                </td>
                              </tr>
                              {open && (
                                <tr><td colSpan={6} id={`details-${key}`} className="bg-muted/30 p-4 sm:p-6"><SubmissionBreakdown sub={sub} questionById={questionById} /></td></tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Phone list */}
                  <ul className="divide-y divide-border md:hidden">
                    {visibleSubs.map((sub, idx) => {
                      const key = rowKey(sub, idx);
                      const open = expandedKey === key;
                      const percentage = Math.round(rawPercent(sub, isGameShow, quizData));
                      const tone = toneFor(percentage);
                      return (
                        <li key={key} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{fullName(sub)}</p>
                              <p className="text-xs text-muted-foreground">{sub.studentClass || "No class"}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${tone.badge}`}>{percentage}%</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percentage}%` }} /></div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="font-semibold tabular-nums text-foreground">{sub.score}/{maxScoreOf(sub, isGameShow, quizData)}</span>
                            {sub.timeTaken > 0 && <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="h-3.5 w-3.5" /> {formatDuration(sub.timeTaken)}</span>}
                            {!isGameShow && sub.tabSwitchCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> {sub.tabSwitchCount} tab switch{sub.tabSwitchCount !== 1 ? "es" : ""}</span>
                            )}
                          </div>
                          <button onClick={() => setExpandedKey(open ? null : key)} aria-expanded={open} aria-controls={`details-m-${key}`} className={`mt-3 inline-flex items-center gap-1 rounded-lg py-1 text-sm font-medium text-brand ${focusRing}`}>
                            {open ? "Hide answers" : "View answers"} {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          {open && <div id={`details-m-${key}`} className="mt-3 rounded-xl bg-muted/30 p-3"><SubmissionBreakdown sub={sub} questionById={questionById} /></div>}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      </div>

         {/* ✅ NEW: Access Codes Modal */}
   {showCodesModal && (
     <Modal title="Access Code History" onClose={() => setShowCodesModal(false)} size="max-w-2xl">
       <div className="space-y-4">
         <p className="text-sm text-muted-foreground">
           Codes automatically expire 30 days after generation. Students cannot use expired codes.
         </p>
         
         <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-muted/30">
           {/* ✅ SAFE MAPPING: Defaults to empty array to prevent the .map crash */}
           {(quizData?.accessCodeHistory || []).length === 0 ? (
             <p className="p-4 text-center text-sm text-muted-foreground">No codes generated yet.</p>
           ) : (
             <ul className="divide-y divide-border">
               {(quizData?.accessCodeHistory || []).map((ac, idx) => {
                 const daysLeft = Math.ceil((new Date(ac.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                 const isExpired = daysLeft <= 0;
                 return (
                   <li key={idx} className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
                     <div className="min-w-0 flex-1">
                       <p className={`font-mono text-base font-bold tracking-wider ${isExpired ? "text-destructive line-through" : "text-foreground"}`}>
                         {ac.code}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         Generated: {new Date(ac.createdAt).toLocaleDateString()}
                         <span className={`ml-2 font-semibold ${isExpired ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                           • {isExpired ? "Expired" : `Expires in ${daysLeft} days`}
                         </span>
                       </p>
                     </div>
                     {!isExpired && (
                       <button
                         onClick={() => {
                           navigator.clipboard.writeText(ac.code);
                           alert("Code copied!");
                         }}
                         className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                       >
                         <Copy className="h-3.5 w-3.5" /> Copy
                       </button>
                     )}
                   </li>
                 );
               })}
             </ul>
           )}
         </div>

         <div className="flex justify-end pt-2">
           <button
             onClick={async () => {
               try {
                 await api.post(`/quiz/${quizId}/regenerate-code`);
                 fetchResults({ silent: true }); // Refresh the modal data
               } catch (err) {
                 alert(err.response?.data?.message || "Failed to generate code");
               }
             }}
             className={primaryBtn}
           >
             <Plus className="h-4 w-4" /> Generate 1 New Code
           </button>
         </div>
       </div>
     </Modal>
   )}

      {/* Modals */}
      {regen.step === "confirm" && (
        <Modal title="Add an access code?" onClose={closeRegen} size="max-w-md">
          <p className="mb-6 text-sm text-muted-foreground">This adds one new access code to this quiz.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button onClick={closeRegen} disabled={isRegenerating} className={`${secondaryBtn} flex-1`}>Cancel</button>
            <button onClick={executeRegenerate} disabled={isRegenerating} className={`${primaryBtn} flex-1`}>
              {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{isRegenerating ? "Adding…" : "Add code"}
            </button>
          </div>
        </Modal>
      )}
      {regen.step === "success" && (
        <Modal title="New code added" onClose={closeRegen} size="max-w-md">
          <p className="mb-4 text-sm text-muted-foreground">Share this code with your student:</p>
          <div className="mb-4 rounded-xl border border-border bg-muted p-4 text-center"><p className="break-all font-mono text-2xl font-bold tracking-wider text-foreground">{regen.code}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => copy(regen.code, "regen")} className={`${secondaryBtn} flex-1`}>{copiedKey === "regen" ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy code</>}</button>
            <button onClick={closeRegen} className={`${primaryBtn} flex-1`}>Done</button>
          </div>
        </Modal>
      )}
      {regen.step === "error" && (
        <Modal title="Couldn't add a code" onClose={closeRegen} size="max-w-md">
          <p className="mb-6 text-sm text-muted-foreground">{regen.message || "Something went wrong. Please try again."}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button onClick={closeRegen} className={`${secondaryBtn} flex-1`}>Close</button>
            <button onClick={() => setRegen({ step: "confirm", code: "" })} className={`${primaryBtn} flex-1`}>Try again</button>
          </div>
        </Modal>
      )}
      {showQuestions && quizData && (
        <Modal title={`All questions (${questions.length})`} icon={<Eye className="h-5 w-5 shrink-0 text-brand" />} size="max-w-3xl" onClose={() => setShowQuestions(false)}>
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const correct = q.correctAnswer?.trim();
              return (
                <div key={q._id ?? idx} className="min-w-0 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
                  <p className="mb-3 break-words font-semibold text-foreground"><span className="mr-2 text-brand">Q{idx + 1}.</span><MathRenderer>{q.question}</MathRenderer></p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(q.options ?? []).map((opt, i) => {
                      const text = opt?.trim() || "";
                      const isCorrect = !!correct && text === correct;
                      return (
                        <div key={i} className={`flex min-w-0 items-start gap-2 rounded-lg border p-3 text-sm ${isCorrect ? "border-green-500/30 bg-green-500/10 font-semibold text-green-700 dark:text-green-400" : "border-border bg-card text-foreground"}`}>
                          <span className="shrink-0 font-bold">{String.fromCharCode(65 + i)}.</span>
                          <span className="min-w-0 flex-1 break-words"><MathRenderer>{text}</MathRenderer></span>
                          {isCorrect && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-label="Correct answer" />}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 rounded-lg border border-brand/10 bg-brand-soft/50 p-3">
                      <p className="break-words text-xs text-muted-foreground"><span className="font-semibold text-foreground">Explanation:</span> <MathRenderer>{q.explanation}</MathRenderer></p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
