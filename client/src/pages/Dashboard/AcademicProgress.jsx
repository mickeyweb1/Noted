import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit2,
  GraduationCap,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import api from "../../utils/api";

const card = "rounded-2xl border border-border bg-card shadow-sm";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

const CATEGORIES = [
  { id: "exam", label: "Exam" },
  { id: "quiz", label: "Quiz" },
  { id: "assignment", label: "Assignment" },
  { id: "project", label: "Project" },
  { id: "homework", label: "Homework" },
  { id: "other", label: "Other" },
];

const PRESET_COLORS = [
  "#4F46E5", // Indigo
  "#0ea5e9", // Sky
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

export default function AcademicProgress() {
  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [termForm, setTermForm] = useState({ name: "", year: "", isCurrent: true });

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    color: "#4F46E5",
    targetScore: "",
    creditHours: 1,
    notes: "",
  });

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [targetSubjectId, setTargetSubjectId] = useState(null);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [assessmentForm, setAssessmentForm] = useState({
    title: "",
    category: "assignment",
    maxScore: 100,
    weight: 1,
    score: "",
    feedback: "",
  });

  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadTerms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/academic/terms");
      const data = response.data?.data || [];
      setTerms(data);
      if (data.length > 0) {
        setSelectedTermId((prev) => {
          if (prev && data.some((t) => t._id === prev)) return prev;
          const current = data.find((t) => t.isCurrent);
          return current ? current._id : data[0]._id;
        });
      } else {
        setSelectedTermId(null);
      }
    } catch {
      setError("Unable to load academic records. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  const currentTerm = terms.find((t) => t._id === selectedTermId) || terms[0] || null;

  // Toggle subject accordion
  const toggleSubject = (subjectId) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  // --------------------------------------------------------------------------
  // TERM HANDLERS
  // --------------------------------------------------------------------------
  const openNewTermModal = () => {
    setEditingTerm(null);
    setTermForm({
      name: "",
      year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      isCurrent: terms.length === 0,
    });
    setTermModalOpen(true);
  };

  const openEditTermModal = (term) => {
    setEditingTerm(term);
    setTermForm({
      name: term.name,
      year: term.year,
      isCurrent: Boolean(term.isCurrent),
    });
    setTermModalOpen(true);
  };

  const handleSaveTerm = async (e) => {
    e.preventDefault();
    if (!termForm.name.trim()) return;
    setSubmitting(true);
    try {
      if (editingTerm) {
        await api.put(`/academic/terms/${editingTerm._id}`, termForm);
      } else {
        await api.post("/academic/terms", termForm);
      }
      setTermModalOpen(false);
      await loadTerms();
    } catch {
      alert("Failed to save term. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTerm = async (termId) => {
    if (!window.confirm("Are you sure you want to delete this term and all its subjects?")) return;
    try {
      await api.delete(`/academic/terms/${termId}`);
      await loadTerms();
    } catch {
      alert("Failed to delete term.");
    }
  };

  // --------------------------------------------------------------------------
  // SUBJECT HANDLERS
  // --------------------------------------------------------------------------
  const openNewSubjectModal = () => {
    if (!currentTerm) return;
    setEditingSubject(null);
    setSubjectForm({
      name: "",
      code: "",
      color: PRESET_COLORS[terms.reduce((acc, t) => acc + (t.subjects?.length || 0), 0) % PRESET_COLORS.length],
      targetScore: "80",
      creditHours: 1,
      notes: "",
    });
    setSubjectModalOpen(true);
  };

  const openEditSubjectModal = (subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      code: subject.code || "",
      color: subject.color || "#4F46E5",
      targetScore: subject.targetScore !== null && subject.targetScore !== undefined ? String(subject.targetScore) : "",
      creditHours: subject.creditHours || 1,
      notes: subject.notes || "",
    });
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!currentTerm || !subjectForm.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...subjectForm,
        targetScore: subjectForm.targetScore !== "" ? Number(subjectForm.targetScore) : null,
        creditHours: Number(subjectForm.creditHours) || 1,
      };

      if (editingSubject) {
        await api.put(`/academic/terms/${currentTerm._id}/subjects/${editingSubject._id}`, payload);
      } else {
        await api.post(`/academic/terms/${currentTerm._id}/subjects`, payload);
      }
      setSubjectModalOpen(false);
      await loadTerms();
    } catch {
      alert("Failed to save subject. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm("Are you sure you want to delete this subject and its assessments?")) return;
    try {
      await api.delete(`/academic/terms/${currentTerm._id}/subjects/${subjectId}`);
      await loadTerms();
    } catch {
      alert("Failed to delete subject.");
    }
  };

  // --------------------------------------------------------------------------
  // ASSESSMENT HANDLERS
  // --------------------------------------------------------------------------
  const openNewAssessmentModal = (subjectId) => {
    setTargetSubjectId(subjectId);
    setEditingAssessment(null);
    setAssessmentForm({
      title: "",
      category: "assignment",
      maxScore: 100,
      weight: 1,
      score: "",
      feedback: "",
    });
    setAssessmentModalOpen(true);
  };

  const openEditAssessmentModal = (subjectId, assessment) => {
    setTargetSubjectId(subjectId);
    setEditingAssessment(assessment);
    setAssessmentForm({
      title: assessment.title,
      category: assessment.category || "assignment",
      maxScore: assessment.maxScore,
      weight: assessment.weight || 1,
      score: assessment.score !== null && assessment.score !== undefined ? String(assessment.score) : "",
      feedback: assessment.feedback || "",
    });
    setAssessmentModalOpen(true);
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    if (!currentTerm || !targetSubjectId || !assessmentForm.title.trim()) return;
    const max = Number(assessmentForm.maxScore);
    if (!Number.isFinite(max) || max <= 0) {
      alert("Maximum score must be greater than 0");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: assessmentForm.title.trim(),
        category: assessmentForm.category,
        maxScore: max,
        weight: Number(assessmentForm.weight) || 1,
        score: assessmentForm.score === "" ? null : Number(assessmentForm.score),
        feedback: assessmentForm.feedback.trim(),
      };

      if (editingAssessment) {
        await api.put(
          `/academic/terms/${currentTerm._id}/subjects/${targetSubjectId}/assessments/${editingAssessment._id}`,
          payload
        );
      } else {
        await api.post(
          `/academic/terms/${currentTerm._id}/subjects/${targetSubjectId}/assessments`,
          payload
        );
      }
      setAssessmentModalOpen(false);
      // Auto-expand subject so learner sees their updated assessment
      setExpandedSubjects((prev) => ({ ...prev, [targetSubjectId]: true }));
      await loadTerms();
    } catch {
      alert("Failed to save assessment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssessment = async (subjectId, assessmentId) => {
    if (!window.confirm("Delete this assessment?")) return;
    try {
      await api.delete(`/academic/terms/${currentTerm._id}/subjects/${subjectId}/assessments/${assessmentId}`);
      await loadTerms();
    } catch {
      alert("Failed to delete assessment.");
    }
  };

  if (loading) {
    return (
      <div className={`${card} flex min-h-80 items-center justify-center text-muted-foreground`}>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your academic progress…
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
            <GraduationCap className="h-4 w-4" /> Academic Progress
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Grade & Target Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track assessments, monitor target grades, and link subjects directly to study materials.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openNewTermModal}
            className={`inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm hover:bg-brand/90 ${focusRing}`}
          >
            <Plus className="h-4 w-4" /> New Term
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={loadTerms} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* NO TERMS STATE */}
      {terms.length === 0 ? (
        <section className={`${card} flex flex-col items-center px-6 py-16 text-center`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <GraduationCap className="h-9 w-9" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-foreground">Start tracking your academic progress</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create your first academic term (such as “Fall 2026” or “Term 1”) to add subjects, log assessment marks, and set target grades.
          </p>
          <button
            type="button"
            onClick={openNewTermModal}
            className={`mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand/90 ${focusRing}`}
          >
            <Plus className="h-4 w-4" /> Create First Term
          </button>
        </section>
      ) : (
        <>
          {/* TERM SELECTOR BAR */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Term:</span>
              <div className="flex flex-wrap gap-1.5">
                {terms.map((term) => (
                  <button
                    key={term._id}
                    type="button"
                    onClick={() => setSelectedTermId(term._id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                      term._id === currentTerm?._id
                        ? "bg-brand text-brand-foreground shadow-sm"
                        : "border border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {term.name} ({term.year})
                    {term.isCurrent && (
                      <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {currentTerm && (
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => openEditTermModal(currentTerm)}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Edit term details"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTerm(currentTerm._id)}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete term"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* TERM SUMMARY STATS */}
          {currentTerm && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Term Average */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Term Average</span>
                  <Sparkles className="h-4 w-4 text-brand" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {currentTerm.termAverage !== null ? `${currentTerm.termAverage}%` : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentTerm.termAverage !== null ? "recorded average" : "no marks yet"}
                  </span>
                </div>
              </div>

              {/* Targets On Track */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Target Progress</span>
                  <Target className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {currentTerm.onTrackCount}/{currentTerm.totalSubjects}
                  </span>
                  <span className="text-xs text-muted-foreground">subjects on track</span>
                </div>
              </div>

              {/* Assessments Total */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Assessments</span>
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {currentTerm.totalAssessments - currentTerm.totalPending}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    of {currentTerm.totalAssessments} graded
                  </span>
                </div>
              </div>

              {/* Pending / Unscored */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
                  <Calendar className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {currentTerm.totalPending}
                  </span>
                  <span className="text-xs text-muted-foreground">unscored / upcoming</span>
                </div>
              </div>
            </div>
          )}

          {/* SUBJECTS LIST */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Subjects ({currentTerm?.subjects?.length || 0})</h2>
                <p className="text-xs text-muted-foreground">
                  Click a subject to view or manage its assessment marks.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewSubjectModal}
                className={`inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-accent ${focusRing}`}
              >
                <Plus className="h-3.5 w-3.5" /> Add Subject
              </button>
            </div>

            {currentTerm?.subjects?.length === 0 ? (
              <div className={`${card} p-8 text-center`}>
                <p className="text-sm text-muted-foreground">No subjects added to this term yet.</p>
                <button
                  type="button"
                  onClick={openNewSubjectModal}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add your first subject
                </button>
              </div>
            ) : (
              currentTerm?.subjects?.map((subject) => {
                const isExpanded = expandedSubjects[subject._id] ?? true;
                const target = subject.targetScore;
                const avg = subject.currentAverage;
                const isBelowTarget = subject.status === "below_target";
                const isOnTrack = subject.status === "on_track";

                return (
                  <article
                    key={subject._id}
                    className={`${card} overflow-hidden transition-shadow hover:shadow-md`}
                  >
                    {/* SUBJECT HEADER */}
                    <div
                      className="flex cursor-pointer flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                      onClick={() => toggleSubject(subject._id)}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center font-bold text-white text-xs"
                          style={{ backgroundColor: subject.color || "#4F46E5" }}
                        >
                          {(subject.code || subject.name.slice(0, 3)).toUpperCase()}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-foreground">{subject.name}</h3>
                            {subject.code && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                                {subject.code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {subject.scoredAssessmentsCount} graded · {subject.pendingAssessmentsCount} pending · {subject.creditHours} credit{subject.creditHours === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        {/* Status / Percentage */}
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-foreground">
                              {avg !== null ? `${avg}%` : "No marks"}
                            </span>
                            {target !== null && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                                  isOnTrack
                                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                    : isBelowTarget
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {isOnTrack ? <TrendingUp className="h-3 w-3" /> : isBelowTarget ? <TrendingDown className="h-3 w-3" /> : null}
                                Target: {target}%
                              </span>
                            )}
                          </div>
                          {isBelowTarget && (
                            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              Below target by {(target - avg).toFixed(1)}%
                            </p>
                          )}
                        </div>

                        {/* Expand toggle */}
                        <div className="text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED CONTENT: ASSESSMENTS TABLE */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4 sm:p-5">
                        {/* ACTIONS & STUDY LINK */}
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openNewAssessmentModal(subject._id);
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90 ${focusRing}`}
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Assessment
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditSubjectModal(subject);
                              }}
                              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                            >
                              Edit Subject
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubject(subject._id);
                              }}
                              className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Delete subject"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Subject Review Link */}
                          <Link
                            to="/revision"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                          >
                            <BookOpen className="h-3.5 w-3.5" /> Practice revision for this subject
                          </Link>
                        </div>

                        {/* ASSESSMENTS LIST */}
                        {subject.assessments.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                            No assessments entered yet. Click "Add Assessment" to record quizzes, exams, or homework marks.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-border bg-card">
                            <table className="w-full text-left text-xs">
                              <thead className="border-b border-border bg-muted/50 font-bold uppercase tracking-wider text-muted-foreground">
                                <tr>
                                  <th className="p-3">Title</th>
                                  <th className="p-3">Category</th>
                                  <th className="p-3">Score / Max</th>
                                  <th className="p-3">Percentage</th>
                                  <th className="p-3">Weight</th>
                                  <th className="p-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {subject.assessments.map((assessment) => {
                                  const isScored =
                                    assessment.score !== null &&
                                    assessment.score !== undefined &&
                                    typeof assessment.score === "number";
                                  const pct = isScored
                                    ? Math.round((assessment.score / assessment.maxScore) * 1000) / 10
                                    : null;

                                  return (
                                    <tr key={assessment._id} className="hover:bg-muted/30">
                                      <td className="p-3 font-semibold text-foreground">
                                        {assessment.title}
                                        {assessment.feedback && (
                                          <p className="mt-0.5 text-[11px] text-muted-foreground italic">
                                            "{assessment.feedback}"
                                          </p>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-foreground">
                                          {assessment.category}
                                        </span>
                                      </td>
                                      <td className="p-3 font-mono">
                                        {isScored ? (
                                          <span className="font-semibold text-foreground">
                                            {assessment.score} / {assessment.maxScore}
                                          </span>
                                        ) : (
                                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                            — / {assessment.maxScore} (Pending)
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-3 font-mono font-bold">
                                        {pct !== null ? (
                                          <span className={pct >= (target || 50) ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                                            {pct}%
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </td>
                                      <td className="p-3 text-muted-foreground font-mono">
                                        {assessment.weight || 1}x
                                      </td>
                                      <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={() => openEditAssessmentModal(subject._id, assessment)}
                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                            title="Edit assessment"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteAssessment(subject._id, assessment._id)}
                                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            title="Delete assessment"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT TERM */}
      {/* ========================================================================= */}
      {termModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {editingTerm ? "Edit Academic Term" : "Create Academic Term"}
              </h3>
              <button
                type="button"
                onClick={() => setTermModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTerm} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Term Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fall Semester, Term 1, Spring 2026"
                  value={termForm.name}
                  onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Academic Year
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2025/2026 or 2026"
                  value={termForm.year}
                  onChange={(e) => setTermForm({ ...termForm, year: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="termIsCurrent"
                  checked={termForm.isCurrent}
                  onChange={(e) => setTermForm({ ...termForm, isCurrent: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                />
                <label htmlFor="termIsCurrent" className="text-xs font-semibold text-foreground">
                  Set as active / current term
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setTermModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingTerm ? "Save Changes" : "Create Term"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT SUBJECT */}
      {/* ========================================================================= */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {editingSubject ? "Edit Subject" : "Add Subject"}
              </h3>
              <button
                type="button"
                onClick={() => setSubjectModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Subject Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, Advanced Biology"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MTH 101"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Target Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 85"
                    value={subjectForm.targetScore}
                    onChange={(e) => setSubjectForm({ ...subjectForm, targetScore: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Color Tag
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSubjectForm({ ...subjectForm, color: col })}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${
                        subjectForm.color === col ? "scale-110 border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setSubjectModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingSubject ? "Save Changes" : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT ASSESSMENT */}
      {/* ========================================================================= */}
      {assessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {editingAssessment ? "Edit Assessment" : "Add Assessment"}
              </h3>
              <button
                type="button"
                onClick={() => setAssessmentModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssessment} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Exam, Essay 1, Unit Quiz"
                  value={assessmentForm.title}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Category
                </label>
                <select
                  value={assessmentForm.category}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, category: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Max Score <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="any"
                    placeholder="e.g. 100 or 20"
                    value={assessmentForm.maxScore}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, maxScore: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Score (Leave blank if pending)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Pending / Unscored"
                    value={assessmentForm.score}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, score: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Tip: Enter 0 for an actual zero mark; leave blank if this assessment hasn't been graded yet.
              </p>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Weight / Factor
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={assessmentForm.weight}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, weight: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Feedback or Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Needs revision on Question 4"
                  value={assessmentForm.feedback}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, feedback: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setAssessmentModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingAssessment ? "Save Changes" : "Add Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
