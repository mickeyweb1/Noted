import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Edit2,
  FileText,
  GraduationCap,
  HelpCircle,
  Loader2,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
  Zap,
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
  const navigate = useNavigate();
  const [terms, setTerms] = useState([]);
  const [cumulative, setCumulative] = useState(null);
  const [selectedTermId, setSelectedTermId] = useState(null);
  const [gradeDisplayMode, setGradeDisplayMode] = useState("percentage"); // 'percentage' | 'gpa' | 'letter'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [libraryItems, setLibraryItems] = useState([]);

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
    linkedContentIds: [],
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

  // What-If Simulator state
  const [whatIfModalOpen, setWhatIfModalOpen] = useState(false);
  const [whatIfSubject, setWhatIfSubject] = useState(null);
  const [whatIfSimulatedScores, setWhatIfSimulatedScores] = useState({});
  const [whatIfTarget, setWhatIfTarget] = useState(85);

  // Booster Quiz state
  const [boostingSubjectId, setBoostingSubjectId] = useState(null);
  const [boosterSuccessModal, setBoosterSuccessModal] = useState(null);

  // Import/Export state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState("");

  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadTerms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [termsRes, libraryRes] = await Promise.all([
        api.get("/academic/terms"),
        api.get("/ai/library").catch(() => ({ data: { data: [] } })),
      ]);
      const data = termsRes.data?.data || [];
      setTerms(data);
      setCumulative(termsRes.data?.cumulative || null);
      setLibraryItems(libraryRes.data?.data || []);

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

  const toggleSubject = (subjectId) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  // Helper for grade display mode
  const formatGrade = (avg, gpa, letter) => {
    if (avg === null || avg === undefined) return "No marks";
    if (gradeDisplayMode === "gpa") return `${gpa ?? 0.0} GPA`;
    if (gradeDisplayMode === "letter") return letter || "—";
    return `${avg}%`;
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
      linkedContentIds: [],
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
      linkedContentIds: (subject.linkedContentIds || []).map((item) => (typeof item === "object" ? item._id : item)),
    });
    setSubjectModalOpen(true);
  };

  const toggleLinkedContent = (id) => {
    setSubjectForm((prev) => {
      const exists = prev.linkedContentIds.includes(id);
      return {
        ...prev,
        linkedContentIds: exists
          ? prev.linkedContentIds.filter((item) => item !== id)
          : [...prev.linkedContentIds, id],
      };
    });
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
      date: new Date().toISOString().slice(0, 10),
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
      date: assessment.date ? assessment.date.slice(0, 10) : "",
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
        date: assessmentForm.date ? new Date(assessmentForm.date) : new Date(),
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

  // --------------------------------------------------------------------------
  // WHAT-IF SIMULATOR
  // --------------------------------------------------------------------------
  const openWhatIfModal = (subject) => {
    setWhatIfSubject(subject);
    setWhatIfTarget(subject.targetScore || 80);
    const initialSim = {};
    (subject.assessments || []).forEach((a) => {
      if (a.score === null || a.score === undefined || a.score === "") {
        initialSim[a._id] = Math.round(a.maxScore * 0.8);
      }
    });
    setWhatIfSimulatedScores(initialSim);
    setWhatIfModalOpen(true);
  };

  const computeSimulatedGrade = () => {
    if (!whatIfSubject) return null;
    const assessments = whatIfSubject.assessments || [];
    let sumProduct = 0;
    let sumWeight = 0;

    assessments.forEach((a) => {
      const w = Number(a.weight) > 0 ? Number(a.weight) : 1;
      const max = Number(a.maxScore) > 0 ? Number(a.maxScore) : 100;
      let score = a.score;
      if (score === null || score === undefined || score === "") {
        score = whatIfSimulatedScores[a._id] !== undefined ? Number(whatIfSimulatedScores[a._id]) : 0;
      }
      sumProduct += (score / max) * 100 * w;
      sumWeight += w;
    });

    return sumWeight > 0 ? Math.round((sumProduct / sumWeight) * 10) / 10 : 0;
  };

  // --------------------------------------------------------------------------
  // TARGET BOOSTER QUIZ GENERATOR
  // --------------------------------------------------------------------------
  const handleGenerateBoosterQuiz = async (subjectId) => {
    if (!currentTerm) return;
    setBoostingSubjectId(subjectId);
    try {
      const response = await api.post(`/academic/terms/${currentTerm._id}/subjects/${subjectId}/boost`);
      setBoosterSuccessModal(response.data?.data);
      window.dispatchEvent(new Event("revision-updated"));
      await loadTerms();
    } catch {
      alert("Could not generate booster quiz. Please try again.");
    } finally {
      setBoostingSubjectId(null);
    }
  };

  // --------------------------------------------------------------------------
  // BACKUP EXPORT & IMPORT
  // --------------------------------------------------------------------------
  const handleExportBackup = async () => {
    try {
      const res = await api.get("/academic/backup/export");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `noted-academic-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export backup. Please try again.");
    }
  };

  const handleJsonInputChange = (text) => {
    setImportJsonText(text);
    setImportError("");
    try {
      if (!text.trim()) {
        setImportPreview(null);
        return;
      }
      const parsed = JSON.parse(text);
      let count = 0;
      if (Array.isArray(parsed.terms)) count = parsed.terms.length;
      else if (Array.isArray(parsed.years)) count = parsed.years.reduce((acc, y) => acc + (y.terms?.length || 0), 0);
      else throw new Error("Invalid structure: missing terms or years array.");
      setImportPreview({ count, data: parsed });
    } catch (err) {
      setImportPreview(null);
      setImportError(err.message || "Invalid JSON syntax");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        handleJsonInputChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importPreview?.data) return;
    setSubmitting(true);
    try {
      await api.post("/academic/backup/import", importPreview.data);
      setImportModalOpen(false);
      setImportJsonText("");
      setImportPreview(null);
      await loadTerms();
      alert("Records imported successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to import records.");
    } finally {
      setSubmitting(false);
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
            Track assessments, simulate exam marks, monitor CGPA, and link subjects directly to study materials.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* SCALE TOGGLE */}
          <div className="inline-flex rounded-xl border border-border bg-card p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setGradeDisplayMode("percentage")}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                gradeDisplayMode === "percentage" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setGradeDisplayMode("gpa")}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                gradeDisplayMode === "gpa" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              4.0 GPA
            </button>
            <button
              type="button"
              onClick={() => setGradeDisplayMode("letter")}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                gradeDisplayMode === "letter" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Letter
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportBackup}
            title="Download full JSON backup of your records"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            title="Import records from Noted or Academic Tracker JSON"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button
            type="button"
            onClick={openNewTermModal}
            className={`inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-sm hover:bg-brand/90 ${focusRing}`}
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
            Create your first academic term or import an existing backup to monitor marks, simulate final exam requirements, and boost weak subjects.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={openNewTermModal}
              className={`inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand/90 ${focusRing}`}
            >
              <Plus className="h-4 w-4" /> Create First Term
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <Upload className="h-4 w-4" /> Import Backup JSON
            </button>
          </div>
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

          {/* TERM & CUMULATIVE SUMMARY STATS */}
          {currentTerm && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Term Average / GPA */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {gradeDisplayMode === "gpa" ? "Term GPA" : gradeDisplayMode === "letter" ? "Term Grade" : "Term Average"}
                  </span>
                  <Sparkles className="h-4 w-4 text-brand" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {formatGrade(currentTerm.termAverage, currentTerm.termGpa, currentTerm.termLetter)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentTerm.termAverage !== null ? `(${currentTerm.termAverage}%)` : "no marks yet"}
                  </span>
                </div>
              </div>

              {/* Cumulative CGPA */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Cumulative CGPA</span>
                  <Award className="h-4 w-4 text-purple-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {cumulative?.cgpa !== null && cumulative?.cgpa !== undefined ? `${cumulative.cgpa}` : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cumulative?.totalCreditsGraded ? `${cumulative.totalCreditsGraded} credits graded` : "all terms"}
                  </span>
                </div>
              </div>

              {/* Targets On Track */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Target Status</span>
                  <Target className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {currentTerm.onTrackCount}/{currentTerm.totalSubjects}
                  </span>
                  <span className="text-xs text-muted-foreground">subjects on track</span>
                </div>
              </div>

              {/* Assessments / Pending */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Assessments</span>
                  <Calendar className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {currentTerm.totalAssessments - currentTerm.totalPending}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    of {currentTerm.totalAssessments} graded ({currentTerm.totalPending} pending)
                  </span>
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
                  View scores, simulate what-if requirements, generate booster quizzes, and review study materials.
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
                const whatIf = subject.whatIf;
                const linkedMaterials = subject.linkedContentIds || [];

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
                          className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-sm"
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
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              {subject.letterGrade || "—"} ({subject.gpa !== null ? `${subject.gpa} GPA` : "—"})
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {subject.scoredAssessmentsCount} graded · {subject.pendingAssessmentsCount} pending · {subject.creditHours} credit{subject.creditHours === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-foreground">
                              {formatGrade(avg, subject.gpa, subject.letterGrade)}
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
                          {whatIf?.status === "in_progress" && whatIf.neededPercentage !== null && (
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Need <span className="font-bold text-brand">{whatIf.neededPercentage}%</span> on remaining
                            </p>
                          )}
                        </div>

                        <div className="text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED CONTENT */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4 sm:p-5">
                        {/* BELOW TARGET ADVISORY & SMART ACTIONS */}
                        {isBelowTarget && (
                          <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                              <TrendingDown className="h-4 w-4 shrink-0" />
                              <span>
                                Score is currently <strong>{(target - avg).toFixed(1)}% below target</strong> ({avg}% vs {target}%).
                                {whatIf?.neededPercentage !== null && ` You need an average of ${whatIf.neededPercentage}% on remaining assessments.`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={boostingSubjectId === subject._id}
                                onClick={() => handleGenerateBoosterQuiz(subject._id)}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                              >
                                {boostingSubjectId === subject._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                Booster Quiz
                              </button>
                              <Link
                                to="/revision"
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-card px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Start revision
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* LINKED STUDY MATERIALS */}
                        {linkedMaterials.length > 0 && (
                          <div className="mb-4 rounded-xl border border-border bg-card p-3">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                              <BookOpen className="h-3.5 w-3.5 text-brand" /> Linked Study Materials:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {linkedMaterials.map((item) => (
                                <Link
                                  key={item._id}
                                  to={item.type === "quiz" ? `/take-quiz?contentId=${item._id}` : "/myLibrary"}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
                                >
                                  <FileText className="h-3 w-3 text-brand" />
                                  <span className="max-w-[160px] truncate">{item.title}</span>
                                  <span className="text-[10px] uppercase text-muted-foreground">({item.type})</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* TOOLBAR: ADD ASSESSMENT / WHAT-IF / BOOSTER / EDIT */}
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
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
                                openWhatIfModal(subject);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                            >
                              <Sliders className="h-3.5 w-3.5 text-brand" /> What-If Simulator
                            </button>
                            <button
                              type="button"
                              disabled={boostingSubjectId === subject._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateBoosterQuiz(subject._id);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
                            >
                              {boostingSubjectId === subject._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-brand" />}
                              Booster Quiz
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

                          <Link
                            to="/revision"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                          >
                            <BookOpen className="h-3.5 w-3.5" /> Practice revision
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
                                        {assessment.date && (
                                          <span className="block text-[11px] font-normal text-muted-foreground">
                                            Due / Date: {new Date(assessment.date).toLocaleDateString()}
                                          </span>
                                        )}
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
      {/* MODAL: WHAT-IF GRADE SIMULATOR */}
      {/* ========================================================================= */}
      {whatIfModalOpen && whatIfSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-brand" />
                <h3 className="text-lg font-bold text-foreground">What-If Exam & Grade Simulator</h3>
              </div>
              <button
                type="button"
                onClick={() => setWhatIfModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-5">
              <div>
                <p className="text-sm font-bold text-foreground">{whatIfSubject.name}</p>
                <p className="text-xs text-muted-foreground">
                  Simulate potential marks on remaining tests, assignments, or finals to forecast your final subject grade.
                </p>
              </div>

              {/* TARGET INPUT */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <span className="text-xs font-semibold text-foreground">Desired Target Grade (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={whatIfTarget}
                  onChange={(e) => setWhatIfTarget(Number(e.target.value))}
                  className="w-20 rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-bold text-foreground text-right"
                />
              </div>

              {/* SIMULATED RESULT CALLOUT */}
              {(() => {
                const simAvg = computeSimulatedGrade();
                const isMet = simAvg !== null && simAvg >= whatIfTarget;
                return (
                  <div
                    className={`rounded-2xl border p-4 text-center ${
                      isMet
                        ? "border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider">Projected Final Grade</p>
                    <p className="mt-1 text-3xl font-black">{simAvg !== null ? `${simAvg}%` : "—"}</p>
                    <p className="mt-1 text-xs font-medium">
                      {isMet ? `✓ Target of ${whatIfTarget}% achieved (+${(simAvg - whatIfTarget).toFixed(1)}% cushion)` : `Below target by ${(whatIfTarget - simAvg).toFixed(1)}%`}
                    </p>
                  </div>
                );
              })()}

              {/* PENDING ASSESSMENTS SLIDERS */}
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pending Assessments (Adjust Simulated Scores):
                </p>
                {whatIfSubject.assessments.filter((a) => a.score === null || a.score === undefined || a.score === "").length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    All assessments have already been recorded.
                  </p>
                ) : (
                  whatIfSubject.assessments
                    .filter((a) => a.score === null || a.score === undefined || a.score === "")
                    .map((a) => {
                      const curVal = whatIfSimulatedScores[a._id] !== undefined ? whatIfSimulatedScores[a._id] : 0;
                      const pct = Math.round((curVal / a.maxScore) * 100);

                      return (
                        <div key={a._id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">{a.title}</span>
                            <span className="font-mono font-bold text-brand">
                              {curVal} / {a.maxScore} ({pct}%)
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={a.maxScore}
                            step="0.5"
                            value={curVal}
                            onChange={(e) =>
                              setWhatIfSimulatedScores({
                                ...whatIfSimulatedScores,
                                [a._id]: Number(e.target.value),
                              })
                            }
                            className="w-full accent-brand cursor-pointer"
                          />
                        </div>
                      );
                    })
                )}
              </div>

              <div className="flex justify-end border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setWhatIfModalOpen(false)}
                  className="rounded-xl bg-brand px-5 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand/90"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BOOSTER QUIZ SUCCESS */}
      {/* ========================================================================= */}
      {boosterSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">Target Booster Quiz Queued!</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {boosterSuccessModal.questionsCount} diagnostic questions tailored to <strong>{boosterSuccessModal.title}</strong> have been queued to your Account-Synced Revision.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  setBoosterSuccessModal(null);
                  navigate("/revision");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90"
              >
                <RotateCcw className="h-4 w-4" /> Practice Now
              </button>
              <button
                type="button"
                onClick={() => setBoosterSuccessModal(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Credit Weight
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={subjectForm.creditHours}
                    onChange={(e) => setSubjectForm({ ...subjectForm, creditHours: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Color Tag
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSubjectForm({ ...subjectForm, color: col })}
                        className={`h-6 w-6 rounded-full border-2 transition-transform ${
                          subjectForm.color === col ? "scale-110 border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* LINK STUDY CONTENT */}
              {libraryItems.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Link Study Materials from Library
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-1.5">
                    Select quizzes or summaries to associate with this subject for quick review.
                  </p>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-border bg-card p-2 space-y-1">
                    {libraryItems.map((item) => {
                      const isSelected = subjectForm.linkedContentIds.includes(item._id);
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => toggleLinkedContent(item._id)}
                          className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors ${
                            isSelected ? "bg-brand/10 text-brand font-semibold" : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <span className="truncate max-w-[300px]">{item.title}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">({item.type})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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

              <div className="grid grid-cols-2 gap-3">
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
                    Due / Exam Date
                  </label>
                  <input
                    type="date"
                    value={assessmentForm.date ? assessmentForm.date.slice(0, 10) : ""}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
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

      {/* ========================================================================= */}
      {/* MODAL: IMPORT BACKUP (JSON) */}
      {/* ========================================================================= */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Import Backup (JSON)</h3>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Upload a JSON backup file exported from Noted or Academic Tracker. Records will be validated and appended to your account.
              </p>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Choose JSON File
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="mt-1.5 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-xl file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground hover:file:bg-accent"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Or Paste JSON Text
                </label>
                <textarea
                  rows={4}
                  placeholder='{"terms": [...] } or {"years": [...] }'
                  value={importJsonText}
                  onChange={(e) => handleJsonInputChange(e.target.value)}
                  className="mt-1.5 w-full font-mono text-xs rounded-xl border border-border bg-card p-3 text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              {importError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {importError}
                </div>
              )}

              {importPreview && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-700 dark:text-green-300">
                  <p className="font-bold">✓ Valid Backup Detected</p>
                  <p className="mt-0.5">Found {importPreview.count} term(s) ready to import.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importPreview || submitting}
                  onClick={handleExecuteImport}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Import Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
