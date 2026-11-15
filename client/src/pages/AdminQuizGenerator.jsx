import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Brain, FileText, Plus, Trash2, Sparkles, Loader2, CheckCircle2, Copy, Check, Users, Clock,
  Image as ImageIcon, Upload, AlertTriangle, ArrowLeft, Download, X, ArrowRight,
} from "lucide-react";
import api from "../utils/api";
import useMyLimits from "../hooks/useMyLimits";
import {
  focusRing, inputCls, card, primaryBtn, secondaryBtn, iconBtnDanger,
  Field, SelectField, NumberInput, ErrorNote, CodeChip, QuestionReviewList,
  useClipboard, newId, readInt, normalizeQuestions, validateQuestions, toPayloadQuestion,
} from "../components/QuizFormKit";
import MathEditor from "../components/MathEditor";

/* ------------------------------------------------------------------ */
/* Hard caps. The user's PLAN limits (from /quiz/my-limits) can only   */
/* make these smaller. Keep in sync with the backend validation.       */
/* ------------------------------------------------------------------ */
const MAX_AI_QUESTIONS = 150;      // AI questions per request (backend now batches these safely)
const MAX_MANUAL_QUESTIONS = 200;  // manual questions per quiz (backend caps at 200)
const MAX_STUDENTS = 500;
const MAX_TAB_SWITCHES = 100;
const NOTES_MAX = 20000;
const MAX_NOTE_FILES = 10;
const MAX_IMAGE_MB = 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const CODE_LIFETIME_DAYS = 30;
const DRAFT_KEY = "noted_quiz_draft_v1";

const TABS = [
  { id: "ai", label: "AI generate", Icon: Brain },
  { id: "manual", label: "Manual", Icon: FileText },
];

const INITIAL_METADATA = {
  title: "",
  difficulty: "Intermediate",
  numQuestions: "5",
  numStudents: "30",
  timeLimit: "10",
  timeUnit: "minutes",
  timeType: "total",
  maxTabSwitches: "",
  passMark: "50",
  layoutMode: "scroll",
  showAnswersAfterSubmission: true,
};

const emptyQuestion = () => ({
  cid: newId(),
  question: "",
  topic: "",
  options: ["", "", "", ""],
  correctOptionIndex: null,
  explanation: "",
  imageUrl: "",
});

const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/* ---------- Draft (so a refresh or dropped connection never loses work) ---------- */
const readDraft = () => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return d && typeof d === "object" ? d : null;
  } catch {
    return null;
  }
};

const clearDraft = () => { 
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } 
};

const hasDraftContent = (d) =>
  Boolean(
    d &&
    ((d.metadata?.title || "").trim() ||
      (d.notes || "").trim() ||
      (Array.isArray(d.previewQuestions) && d.previewQuestions.length) ||
      (Array.isArray(d.manualQuestions) && d.manualQuestions.some((q) => (q?.question || "").trim())))
  );

const isQuestionReady = (q) =>
  Boolean((q.question || "").trim()) &&
  q.options.filter((o) => (o || "").trim()).length >= 2 &&
  q.correctOptionIndex !== null &&
  Boolean((q.options[q.correctOptionIndex] || "").trim());

export default function AdminQuizGenerator() {
  const navigate = useNavigate();
  const { copy, copiedKey } = useClipboard();
  const { limits, refresh: refreshLimits } = useMyLimits();

  const [draft] = useState(readDraft);
  const draftPreview = Array.isArray(draft?.previewQuestions) ? draft.previewQuestions : [];
  const draftManual =
    Array.isArray(draft?.manualQuestions) && draft.manualQuestions.length
      ? draft.manualQuestions.map((q) => ({
          ...emptyQuestion(),
          ...q,
          cid: q?.cid || newId(),
          options: Array.isArray(q?.options) && q.options.length === 4 ? q.options.map((o) => String(o ?? "")) : ["", "", "", ""],
        }))
      : null;

  const [activeTab, setActiveTab] = useState(draft?.activeTab === "manual" ? "manual" : "ai");
  const [errorMessage, setErrorMessage] = useState("");
  const [metadata, setMetadata] = useState(() => ({ ...INITIAL_METADATA, ...(draft?.metadata || {}) }));
  const [draftNotice, setDraftNotice] = useState(() => hasDraftContent(draft));
  const [notes, setNotes] = useState(typeof draft?.notes === "string" ? draft.notes : "");
  const [focusTopics, setFocusTopics] = useState(typeof draft?.focusTopics === "string" ? draft.focusTopics : "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingNotes, setIsUploadingNotes] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [accessCodes, setAccessCodes] = useState([]);
  const [previewQuestions, setPreviewQuestions] = useState(draftPreview);
  const [requestedCount, setRequestedCount] = useState(draft?.requestedCount ?? null);
  const [isReviewing, setIsReviewing] = useState(Boolean(draft?.isReviewing) && draftPreview.length > 0);
  const [manualQuestions, setManualQuestions] = useState(() => draftManual || [emptyQuestion()]);
  const [uploadingCid, setUploadingCid] = useState(null);
  const tabRefs = useRef({});

  /* ---------------- plan limits ---------------- */
  const maxQ = Math.min(MAX_AI_QUESTIONS, limits?.maxQuestionsPerQuiz ?? MAX_AI_QUESTIONS);
  const maxS = Math.min(MAX_STUDENTS, limits?.maxStudents ?? MAX_STUDENTS);
  const creditsLeft = limits?.credits?.remaining ?? null; // null = unlimited / not loaded
  const planLocked = Boolean(limits?.locked);
  const requestedQuestions = Number(metadata.numQuestions) || 0;
  const notEnoughCredits = creditsLeft !== null && requestedQuestions > creditsLeft;

  // Only pull values DOWN when they exceed the plan. Never rewrite what the teacher is typing.
  useEffect(() => {
    if (!limits) return;
    setMetadata((prev) => {
      const clamp = (v, max) => {
        const n = Number(v);
        return v !== "" && Number.isFinite(n) && n > max ? String(max) : v;
      };
      const numStudents = clamp(prev.numStudents, maxS);
      const numQuestions = clamp(prev.numQuestions, maxQ);
      return numStudents === prev.numStudents && numQuestions === prev.numQuestions ? prev : { ...prev, numStudents, numQuestions };
    });
  }, [limits, maxQ, maxS]);

  const setField = (field) => (value) => {
    setErrorMessage("");
    setMetadata((prev) => ({ ...prev, [field]: value }));
  };

  /* ---------------- autosave draft ---------------- */
  useEffect(() => {
    if (generatedQuiz) return undefined;
    const timer = setTimeout(() => {
      try {
        const dirty =
          metadata.title.trim() ||
          notes.trim() ||
          previewQuestions.length > 0 ||
          manualQuestions.some((q) => (q.question || "").trim() || q.options.some((o) => (o || "").trim()));
        if (!dirty) return localStorage.removeItem(DRAFT_KEY);
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ metadata, notes, focusTopics, manualQuestions, previewQuestions, requestedCount, isReviewing, activeTab, savedAt: Date.now() })
        );
      } catch { /* storage full or unavailable */ }
      return undefined;
    }, 600);
    return () => clearTimeout(timer);
  }, [metadata, notes, focusTopics, manualQuestions, previewQuestions, requestedCount, isReviewing, activeTab, generatedQuiz]);

  // Warn only while a request is in flight (the work is already saved otherwise)
  useEffect(() => {
    if (!isGenerating && !isUploadingNotes) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isGenerating, isUploadingNotes]);

  const handleCopy = async (text, key) => {
    const ok = await copy(text, key);
    if (!ok) setErrorMessage("Couldn't copy. Select the text and copy it manually.");
  };

  const readSettings = (needQuestionCount) => {
    const title = metadata.title.trim();
    if (!title) return { error: "Enter a quiz title." };
    const maxTime = metadata.timeUnit === "minutes" ? 600 : 3600;
    const minTime = metadata.timeUnit === "minutes" ? 1 : 5;
    const numQuestions = needQuestionCount
      ? readInt(metadata.numQuestions, "Number of questions", 1, maxQ)
      : { value: 0 };
    const numStudents = readInt(metadata.numStudents, "Number of students", 1, maxS);
    const timeLimit = readInt(metadata.timeLimit, "Time limit", minTime, maxTime);
    const passMark = readInt(metadata.passMark, "Pass mark", 0, 100);
    const bad = [numQuestions, numStudents, timeLimit, passMark].find((r) => r.error);
    if (bad) return { error: bad.error };

    let maxTabSwitches = null;
    if (metadata.maxTabSwitches !== "") {
      const tabs = readInt(metadata.maxTabSwitches, "Max tab switches", 1, MAX_TAB_SWITCHES);
      if (tabs.error) return { error: tabs.error };
      maxTabSwitches = tabs.value;
    }

    return {
      value: {
        title,
        difficulty: metadata.difficulty,
        numQuestions: numQuestions.value,
        numStudents: numStudents.value,
        timeLimit: timeLimit.value,
        timeUnit: metadata.timeUnit,
        timeType: metadata.timeType,
        maxTabSwitches,
        passMark: passMark.value,
        layoutMode: metadata.layoutMode,
        showAnswersAfterSubmission: metadata.showAnswersAfterSubmission,
      },
    };
  };

  const handleFileUpload = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0) return;

    const files = picked.slice(0, MAX_NOTE_FILES);
    const problems = [];
    if (picked.length > files.length) {
      problems.push(`only the first ${MAX_NOTE_FILES} files were used`);
    }

    setIsUploadingNotes(true);
    setErrorMessage("");
    let extracted = "";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(files.length > 1 ? `Reading file ${i + 1} of ${files.length}…` : "Reading your file…");
      try {
        if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
          extracted += `\n\n--- File: ${file.name} ---\n${await file.text()}`;
        } else if (file.type.startsWith("image/")) {
          if (file.size > MAX_IMAGE_BYTES) {
            problems.push(`${file.name} is over ${MAX_IMAGE_MB} MB`);
            continue;
          }
          const imageUrl = await readAsDataURL(file);
          const res = await api.post("/ai/ocr/extract-text", { imageUrl });
          if (res.data?.success && res.data.text?.trim()) {
            extracted += `\n\n--- Image: ${file.name} ---\n${res.data.text}`;
          } else {
            problems.push(`no text found in ${file.name}`);
          }
        } else {
          problems.push(`${file.name} isn't a supported file type`);
        }
      } catch {
        problems.push(`${file.name} couldn't be processed`);
      }
    }

    if (extracted) setNotes((prev) => prev + (prev ? "\n" : "") + extracted);
    if (problems.length) setErrorMessage(`Some files were skipped: ${problems.join("; ")}.`);
    setUploadProgress("");
    setIsUploadingNotes(false);
  };

  const handleImageUpload = async (cid, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrorMessage("Choose an image file.");
    if (file.size > MAX_IMAGE_BYTES) return setErrorMessage(`Images must be under ${MAX_IMAGE_MB} MB.`);

    setUploadingCid(cid);
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post("/quiz/upload/quiz-image", formData);
      if (activeTab === "ai" && isReviewing) {
        setPreviewQuestions((prev) => prev.map((q) => (q.cid === cid ? { ...q, imageUrl: res.data.imageUrl } : q)));
      } else {
        setManualQuestions((prev) => prev.map((q) => (q.cid === cid ? { ...q, imageUrl: res.data.imageUrl } : q)));
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Couldn't upload the image. Try again.");
    } finally {
      setUploadingCid(null);
    }
  };

  const handleAIGenerate = async () => {
    const s = readSettings(true);
    if (s.error) return setErrorMessage(s.error);
    if (!notes.trim()) return setErrorMessage("Enter or upload your notes first.");
    if (notes.length > NOTES_MAX) {
      return setErrorMessage(`Your notes are too long. Keep them under ${NOTES_MAX.toLocaleString()} characters.`);
    }
    if (creditsLeft !== null && s.value.numQuestions > creditsLeft) {
      return setErrorMessage(
        `You only have ${creditsLeft} AI credit${creditsLeft === 1 ? "" : "s"} left this month. Ask for fewer questions or upgrade your plan.`
      );
    }

    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/quiz/generate-ai-preview", {
        notes,
        focusTopics: focusTopics.trim(),
        difficulty: s.value.difficulty,
        numQuestions: s.value.numQuestions,
      });
      const questions = normalizeQuestions(res.data?.data?.questions).map((q) => ({ ...q, imageUrl: q.imageUrl || "" }));
      if (questions.length === 0) {
        return setErrorMessage("The AI didn't return usable questions. Add more detail to your notes and try again.");
      }
      setPreviewQuestions(questions);
      setRequestedCount(s.value.numQuestions);
      setIsReviewing(true);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Couldn't generate questions. Try again.");
    } finally {
      setIsGenerating(false);
      refreshLimits();
    }
  };

  const createQuiz = async (settings, questions) => {
    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/quiz/create-manual", {
        title: settings.title,
        difficulty: settings.difficulty,
        numStudents: settings.numStudents,
        timeLimit: settings.timeLimit,
        timeUnit: settings.timeUnit,
        timeType: settings.timeType,
        numQuestions: questions.length,
        maxTabSwitches: settings.maxTabSwitches,
        passMark: settings.passMark,
        layoutMode: settings.layoutMode,
        showAnswersAfterSubmission: settings.showAnswersAfterSubmission,
        questions,
        useAIAutocomplete: false,
      });
      setGeneratedQuiz(res.data.data);
      setAccessCodes(res.data.accessCodes ?? []);
      setIsReviewing(false);
      clearDraft();
      setDraftNotice(false);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Couldn't create the quiz. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalizeQuiz = async () => {
    const s = readSettings(false);
    if (s.error) return setErrorMessage(s.error);
    if (previewQuestions.length === 0) return setErrorMessage("There are no questions to create the quiz with.");
    const questionError = validateQuestions(previewQuestions);
    if (questionError) return setErrorMessage(questionError);
    await createQuiz(s.value, previewQuestions.map(toPayloadQuestion));
  };

  const addQuestionToPreview = () => {
    setPreviewQuestions((prev) => [
      ...prev,
      { cid: newId(), question: "", topic: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", imageUrl: "" },
    ]);
  };

  const updateManualQuestion = (cid, patch) =>
    setManualQuestions((prev) => prev.map((q) => (q.cid === cid ? { ...q, ...patch } : q)));

  const updateOption = (cid, optIdx, value) =>
    setManualQuestions((prev) =>
      prev.map((q) => (q.cid === cid ? { ...q, options: q.options.map((o, i) => (i === optIdx ? value : o)) } : q))
    );

  const scrollToQuestion = (cid) =>
    requestAnimationFrame(() => document.getElementById(`mq-${cid}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));

  const addManualQuestion = () => {
    const q = emptyQuestion();
    setManualQuestions((prev) => (prev.length >= MAX_MANUAL_QUESTIONS ? prev : [...prev, q]));
    scrollToQuestion(q.cid);
  };

  const duplicateManualQuestion = (cid) => {
    const newCid = newId();
    setManualQuestions((prev) => {
      const i = prev.findIndex((q) => q.cid === cid);
      if (i < 0 || prev.length >= MAX_MANUAL_QUESTIONS) return prev;
      const copyOf = { ...prev[i], cid: newCid, options: [...prev[i].options] };
      return [...prev.slice(0, i + 1), copyOf, ...prev.slice(i + 1)];
    });
    scrollToQuestion(newCid);
  };

  const handleCreateManualQuiz = async () => {
    if (uploadingCid) return setErrorMessage("Wait for the image upload to finish.");
    const s = readSettings(false);
    if (s.error) return setErrorMessage(s.error);

    const prepared = manualQuestions.map((q) => ({
      ...q,
      correctAnswer: q.correctOptionIndex === null ? "" : q.options[q.correctOptionIndex] ?? "",
    }));
    const questionError = validateQuestions(prepared);
    if (questionError) return setErrorMessage(questionError);

    const questions = prepared.map(({ correctOptionIndex, ...q }) => toPayloadQuestion(q));
    await createQuiz(s.value, questions);
  };

  const resetAll = ({ fresh = false } = {}) => {
    clearDraft();
    setDraftNotice(false);
    setGeneratedQuiz(null);
    setAccessCodes([]);
    setPreviewQuestions([]);
    setRequestedCount(null);
    setManualQuestions([emptyQuestion()]);
    setNotes("");
    setFocusTopics("");
    setIsReviewing(false);
    setErrorMessage("");
    if (fresh) setMetadata(INITIAL_METADATA);
    refreshLimits();
  };

  const downloadCodes = () => {
    const title = generatedQuiz?.title || "Quiz";
    const body = `${title}\nAccess codes (valid ${CODE_LIFETIME_DAYS} days, one use each)\n\n${accessCodes.join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_").slice(0, 40) || "quiz"}-codes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const switchTab = (id) => {
    setActiveTab(id);
    setErrorMessage("");
  };

  const onTabKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = activeTab === "ai" ? "manual" : "ai";
    switchTab(next);
    tabRefs.current[next]?.focus();
  };

  const tabCls = (active) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${focusRing} ${
      active ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  const readyCount = useMemo(() => manualQuestions.filter(isQuestionReady).length, [manualQuestions]);
  const locked = !!generatedQuiz || isGenerating;
  const isAI = activeTab === "ai";
  const outOfCredits = creditsLeft !== null && creditsLeft <= 0;
  const notesOver = notes.length - NOTES_MAX;
  const canGenerate = !(isGenerating || isUploadingNotes || planLocked || outOfCredits || notEnoughCredits || !notes.trim() || notesOver > 0);

  return (
    <div className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-foreground">Quiz manager</h1>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground ${focusRing}`}
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>
        </div>

        <ErrorNote>{errorMessage}</ErrorNote>
        {planLocked && <ErrorNote>{limits.locked}</ErrorNote>}

        {draftNotice && !generatedQuiz && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand-soft p-3 text-sm text-foreground">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-brand" /> We restored your unsaved draft.</span>
            <span className="flex gap-2">
              <button onClick={() => resetAll({ fresh: true })} className={`rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent ${focusRing}`}>Start fresh</button>
              <button onClick={() => setDraftNotice(false)} aria-label="Dismiss" className={`rounded-lg p-1.5 text-muted-foreground transition hover:text-foreground ${focusRing}`}><X className="h-4 w-4" /></button>
            </span>
          </div>
        )}

        {!generatedQuiz && (
          <div role="tablist" aria-label="How to add questions" onKeyDown={onTabKeyDown} className="flex w-full gap-1 rounded-xl border border-border bg-card p-1 sm:w-fit">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                ref={(el) => { tabRefs.current[id] = el; }}
                role="tab"
                id={`tab-${id}`}
                aria-selected={activeTab === id}
                aria-controls={`panel-${id}`}
                tabIndex={activeTab === id ? 0 : -1}
                onClick={() => switchTab(id)}
                className={tabCls(activeTab === id)}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        )}

        <div className={`${card} space-y-5`}>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Quiz settings</h2>
            <p className="text-sm text-muted-foreground">
              {generatedQuiz ? "These settings are locked because the quiz is already created." : "These apply to both AI and manual quizzes."}
            </p>
          </div>
          <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Quiz title" htmlFor="quiz-title" className="md:col-span-2">
                <input
                  id="quiz-title"
                  type="text"
                  maxLength={120}
                  placeholder="e.g., Photosynthesis midterm"
                  value={metadata.title}
                  onChange={(e) => setField("title")(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Difficulty" htmlFor="quiz-difficulty">
                <SelectField id="quiz-difficulty" value={metadata.difficulty} onChange={(e) => setField("difficulty")(e.target.value)}>
                  <option>Basic</option><option>Intermediate</option><option>Hard</option><option>Max</option>
                </SelectField>
              </Field>

              {isAI ? (
                <div className="space-y-1">
                  <Field label="Number of questions" htmlFor="quiz-questions" hint={`1 to ${maxQ} on your plan. The AI may return fewer.`}>
                    <NumberInput id="quiz-questions" aria-describedby="quiz-questions-hint" value={metadata.numQuestions} onChange={setField("numQuestions")} placeholder="e.g., 5" />
                  </Field>
                  {limits?.plan === "free" && (
                    <Link to="/pricing" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                      <Sparkles className="h-3 w-3" /> Upgrade for more AI credits and higher limits
                    </Link>
                  )}
                </div>
              ) : (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-foreground">Number of questions</p>
                  <div className="rounded-xl border border-border bg-muted px-3.5 py-2.5 text-foreground">
                    {manualQuestions.length} (counted from the questions you add)
                  </div>
                </div>
              )}

              <Field label="Number of students (codes)" htmlFor="quiz-students" hint={`1 to ${maxS} on your plan. One access code is created per student.`}>
                <NumberInput id="quiz-students" aria-describedby="quiz-students-hint" value={metadata.numStudents} onChange={setField("numStudents")} placeholder="e.g., 30" />
              </Field>

              <Field label="Pass mark (%)" htmlFor="quiz-pass" hint="Students at or above this percentage pass.">
                <NumberInput id="quiz-pass" aria-describedby="quiz-pass-hint" value={metadata.passMark} onChange={setField("passMark")} placeholder="e.g., 50" />
              </Field>

              <Field label="Max tab switches (optional)" htmlFor="quiz-tabs" hint="Leave blank to turn this off.">
                <NumberInput id="quiz-tabs" aria-describedby="quiz-tabs-hint" value={metadata.maxTabSwitches} onChange={setField("maxTabSwitches")} placeholder="e.g., 6" />
              </Field>

              <Field label="Question layout" htmlFor="quiz-layout">
                <SelectField id="quiz-layout" value={metadata.layoutMode} onChange={(e) => setField("layoutMode")(e.target.value)}>
                  <option value="scroll">Scroll (All questions at once)</option>
                  <option value="paginated">One by one (Paginated)</option>
                </SelectField>
              </Field>

              <Field label="Time limit" htmlFor="quiz-time" className="md:col-span-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <NumberInput id="quiz-time" value={metadata.timeLimit} onChange={setField("timeLimit")} className="pl-10" />
                  </div>
                  <SelectField label="Time unit" value={metadata.timeUnit} onChange={(e) => setField("timeUnit")(e.target.value)}>
                    <option value="seconds">seconds</option><option value="minutes">minutes</option>
                  </SelectField>
                  <SelectField label="Time applies to" value={metadata.timeType} onChange={(e) => setField("timeType")(e.target.value)}>
                    <option value="total">total</option><option value="perQuestion">per question</option>
                  </SelectField>
                </div>
              </Field>

              <label htmlFor="quiz-show-answers" className="md:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:bg-accent/40">
                <input
                  id="quiz-show-answers"
                  type="checkbox"
                  checked={metadata.showAnswersAfterSubmission}
                  onChange={(e) => setField("showAnswersAfterSubmission")(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">Show answer review after submission</span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">When enabled, students can see their answers, correct responses, and any explanations after submitting.</span>
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        {isAI && isReviewing && !generatedQuiz && (
          <div className="space-y-4 rounded-2xl border border-brand/30 bg-card p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-brand" /> Review generated questions
              </h2>
              <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                {previewQuestions.length} questions
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Check every answer before you create the quiz. Use the pencil to fix a question or its correct answer. Your work here is saved automatically.
              {requestedCount !== null && previewQuestions.length !== requestedCount && <> You asked for {requestedCount}.</>}
            </p>

            <button
              onClick={addQuestionToPreview}
              disabled={previewQuestions.length >= MAX_MANUAL_QUESTIONS}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/50 bg-brand/5 py-3 text-sm font-semibold text-brand transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add Custom Question
            </button>

            <QuestionReviewList
              questions={previewQuestions}
              onChange={setPreviewQuestions}
              onImageUpload={handleImageUpload}
              uploadingCid={uploadingCid}
            />

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button onClick={() => { setIsReviewing(false); setErrorMessage(""); }} disabled={isGenerating} className={`${secondaryBtn} flex-1`}>
                Back to notes
              </button>
              <button onClick={handleFinalizeQuiz} disabled={isGenerating || planLocked || previewQuestions.length === 0 || uploadingCid !== null} className={`${primaryBtn} flex-1`}>
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Create quiz and get codes
              </button>
            </div>
          </div>
        )}

        {isAI && !isReviewing && !generatedQuiz && (
          <div role="tabpanel" id="panel-ai" aria-labelledby="tab-ai" className={`${card} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Sparkles className="h-5 w-5 text-brand" /> AI question generator
              </h2>
              {limits?.credits?.total != null && (
                <span className="text-right">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${outOfCredits ? "bg-destructive/10 text-destructive" : "bg-brand-soft text-brand"}`}>
                    {creditsLeft} / {limits.credits.total} AI credits left
                  </span>
                  {limits.credits.resetsAt && (
                    <span className="mt-1 block text-[11px] text-muted-foreground">Resets {new Date(limits.credits.resetsAt).toLocaleDateString()}</span>
                  )}
                </span>
              )}
            </div>

            {previewQuestions.length > 0 && (
              <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand-soft p-3 text-sm text-foreground">
                <span>You have <strong>{previewQuestions.length}</strong> generated questions waiting for review. Generating again replaces them and uses more credits.</span>
                <button onClick={() => setIsReviewing(true)} className={`inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition hover:bg-brand/90 ${focusRing}`}>
                  Resume review <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div>
              <input
                type="file"
                multiple
                accept=".txt,text/plain,image/png,image/jpeg"
                onChange={handleFileUpload}
                disabled={isUploadingNotes}
                className="peer sr-only"
                id="quiz-file-upload"
              />
              <label
                htmlFor="quiz-file-upload"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 text-center transition hover:border-brand/50 hover:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {isUploadingNotes ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-brand" />
                    <span className="text-sm font-medium text-foreground">{uploadProgress || "Reading your files…"}</span>
                  </>
                ) : (
                  <>
                    <div className="rounded-full bg-brand-soft p-3 text-brand"><Upload className="h-6 w-6" /></div>
                    <span className="text-sm font-medium text-foreground">Upload your notes</span>
                    <span className="text-xs text-muted-foreground">
                      Up to {MAX_NOTE_FILES} images (under {MAX_IMAGE_MB} MB each) or .txt files
                    </span>
                  </>
                )}
              </label>
            </div>

            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => { setErrorMessage(""); setNotes(e.target.value); }}
                rows={8}
                aria-label="Notes"
                placeholder="Or paste your notes, textbook text or lecture summary here…"
                className={`${inputCls} p-4 pr-16`}
              />
              {notes && (
                <button
                  onClick={() => setNotes("")}
                  className={`absolute right-3 top-3 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:text-destructive ${focusRing}`}
                >
                  Clear
                </button>
              )}
            </div>
            <p className={`text-right text-xs ${notesOver > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {notes.length.toLocaleString()} / {NOTES_MAX.toLocaleString()} characters
              {notesOver > 0 && <> · trim {notesOver.toLocaleString()} characters to continue</>}
            </p>

            <Field label="Specific Topics to Focus On (Optional)" htmlFor="quiz-topics" hint="e.g., Photosynthesis, Chapter 3. Leave blank to use the whole note.">
              <input
                id="quiz-topics"
                type="text"
                maxLength={200}
                placeholder="e.g., Topic 1, Topic 2"
                value={focusTopics}
                onChange={(e) => setFocusTopics(e.target.value)}
                className={inputCls}
              />
            </Field>

            {creditsLeft !== null && requestedQuestions > 0 && (
              <p className={`text-sm ${notEnoughCredits ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                {notEnoughCredits
                  ? `This needs ${requestedQuestions} credits but you have ${creditsLeft}. Ask for fewer questions or upgrade.`
                  : `This will use up to ${requestedQuestions} AI credit${requestedQuestions === 1 ? "" : "s"} (you're only charged for questions returned).`}
              </p>
            )}

            <button onClick={handleAIGenerate} disabled={!canGenerate} className={`${primaryBtn} w-full`}>
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {isGenerating ? "Generating…" : outOfCredits ? "Out of AI credits" : "Generate questions for review"}
            </button>
          </div>
        )}

        {!isAI && !generatedQuiz && (
          <div role="tabpanel" id="panel-manual" aria-labelledby="tab-manual" className="space-y-4">
            {manualQuestions.map((q, idx) => (
              <div key={q.cid} id={`mq-${q.cid}`} className={`${card} scroll-mt-24 space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-3 font-semibold text-foreground">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isQuestionReady(q) ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-brand-soft text-brand"}`}>
                      {isQuestionReady(q) ? <Check className="h-4 w-4" /> : idx + 1}
                    </span>
                    Question {idx + 1}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duplicateManualQuestion(q.cid)}
                      disabled={manualQuestions.length >= MAX_MANUAL_QUESTIONS}
                      aria-label={`Duplicate question ${idx + 1}`}
                      title="Duplicate"
                      className={`rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40 ${focusRing}`}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {manualQuestions.length > 1 && (
                      <button
                        onClick={() => setManualQuestions((prev) => prev.filter((item) => item.cid !== q.cid))}
                        aria-label={`Remove question ${idx + 1}`}
                        className={iconBtnDanger}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id={`q-img-${q.cid}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => { handleImageUpload(q.cid, e.target.files[0]); e.target.value = ""; }}
                    disabled={uploadingCid === q.cid}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={`q-img-${q.cid}`}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition hover:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-brand"
                  >
                    <ImageIcon className="h-4 w-4" /> {q.imageUrl ? "Replace image" : "Add image"}
                  </label>
                  {uploadingCid === q.cid && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {q.imageUrl && (
                    <>
                      <img src={q.imageUrl} alt="" className="h-10 w-10 rounded-md border border-border object-cover" />
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                        <Check className="h-3.5 w-3.5" /> Image attached
                      </span>
                      <button
                        onClick={() => updateManualQuestion(q.cid, { imageUrl: "" })}
                        className={`rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:text-destructive ${focusRing}`}
                      >
                        Remove image
                      </button>
                    </>
                  )}
                </div>

                <MathEditor 
                  value={q.question} 
                  onChange={(val) => { setErrorMessage(""); updateManualQuestion(q.cid, { question: val }); }} 
                  placeholder="Question text (Use the toolbar or $...$ for math)" 
                />

                <input
                  type="text"
                  aria-label={`Question ${idx + 1} topic`}
                  placeholder="Topic (optional, e.g., Fractions)"
                  maxLength={80}
                  value={q.topic || ""}
                  onChange={(e) => updateManualQuestion(q.cid, { topic: e.target.value })}
                  className={`${inputCls} text-sm`}
                />

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Select the circle next to the correct answer. Use $...$ around maths in options.</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctOptionIndex === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2.5 rounded-xl border p-2 transition-colors ${isCorrect ? "border-green-500/50 bg-green-500/10" : "border-transparent"}`}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.cid}`}
                            aria-label={`Mark option ${String.fromCharCode(65 + optIdx)} as correct`}
                            checked={isCorrect}
                            onChange={() => updateManualQuestion(q.cid, { correctOptionIndex: optIdx })}
                            className="h-4 w-4 shrink-0 accent-brand"
                          />
                          <textarea
                            aria-label={`Option ${String.fromCharCode(65 + optIdx)}`}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            value={opt}
                            onChange={(e) => { setErrorMessage(""); updateOption(q.cid, optIdx, e.target.value); }}
                            className={`${inputCls} min-h-[50px] min-w-0 flex-1 resize-y py-2 text-sm`}
                            rows={2}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <input
                  type="text"
                  aria-label={`Question ${idx + 1} explanation`}
                  placeholder="Explanation (optional)"
                  value={q.explanation}
                  onChange={(e) => updateManualQuestion(q.cid, { explanation: e.target.value })}
                  className={`${inputCls} text-sm`}
                />
              </div>
            ))}

            <button
              onClick={addManualQuestion}
              disabled={manualQuestions.length >= MAX_MANUAL_QUESTIONS}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 font-semibold text-muted-foreground transition hover:border-brand/50 hover:text-brand disabled:opacity-50 ${focusRing}`}
            >
              <Plus className="h-4 w-4" /> Add question
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{readyCount}</span> of {manualQuestions.length} questions ready · saved automatically on this device
            </p>
            <button
              onClick={handleCreateManualQuiz}
              disabled={isGenerating || planLocked || uploadingCid !== null}
              className={`${primaryBtn} w-full py-4 text-lg`}
            >
              {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
              {uploadingCid !== null ? "Uploading image…" : "Create quiz and get codes"}
            </button>
          </div>
        )}

        {generatedQuiz && (
          <div className="space-y-6 rounded-2xl border border-green-500/30 bg-green-500/5 p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" /> Quiz created
              </h2>
              <button onClick={() => resetAll()} className={`${secondaryBtn} py-2 text-sm`}>
                <Plus className="h-4 w-4" /> Create another
              </button>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <h3 className="mb-3 font-semibold text-foreground">{generatedQuiz.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">{generatedQuiz.questions?.length ?? 0} questions</span>
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand">{metadata.difficulty}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                  {metadata.timeLimit} {metadata.timeUnit}, {metadata.timeType === "perQuestion" ? "per question" : "total"}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">Pass mark {metadata.passMark}%</span>
              </div>
            </div>

            <button
              onClick={() => navigate("/admin/quiz-results")}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-brand/20 bg-brand-soft py-3 font-semibold text-brand transition hover:bg-brand/20 ${focusRing}`}
            >
              View quiz results
            </button>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <Users className="h-4 w-4" /> Student access codes ({accessCodes.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={downloadCodes}
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-accent ${focusRing}`}
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                  <button
                    onClick={() => handleCopy(accessCodes.join("\n"), "all")}
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-accent ${focusRing}`}
                  >
                    {copiedKey === "all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === "all" ? "Copied" : "Copy all"}
                  </button>
                </div>
              </div>
              <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-border bg-background p-2 sm:grid-cols-4 md:grid-cols-5">
                {accessCodes.map((code, idx) => (
                  <CodeChip key={`${code}-${idx}`} code={code} copied={copiedKey === `code-${idx}`} onCopy={() => handleCopy(code, `code-${idx}`)} />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Share these codes with your students. Each code can only be used once and is valid for {CODE_LIFETIME_DAYS} days.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
