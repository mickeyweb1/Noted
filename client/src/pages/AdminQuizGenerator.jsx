import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, FileText, Plus, Trash2, Sparkles, Loader2, CheckCircle2, Copy, Check, Users, Clock,
  Image as ImageIcon, Upload, AlertTriangle, ArrowLeft,
} from "lucide-react";
import api from "../utils/api";
import {
  focusRing, inputCls, card, primaryBtn, secondaryBtn, iconBtnDanger,
  Field, SelectField, NumberInput, ErrorNote, CodeChip, QuestionReviewList,
  useClipboard, newId, readInt, normalizeQuestions, validateQuestions, toPayloadQuestion,
} from "../components/QuizFormKit";

/* ------------------------------------------------------------------ */
/* Limits. Keep these in sync with the backend validation.             */
/* ------------------------------------------------------------------ */
const MAX_QUESTIONS = 50;
const MAX_STUDENTS = 500;
const MAX_TAB_SWITCHES = 100;
const NOTES_MAX = 20000;
const MAX_NOTE_FILES = 10;
const MAX_IMAGE_MB = 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

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
  layoutMode: "scroll",
  showAnswersAfterSubmission: true,
};

const emptyQuestion = () => ({
  cid: newId(),
  question: "",
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

export default function AdminQuizGenerator() {
  const navigate = useNavigate();
  const { copy, copiedKey } = useClipboard();

  const [activeTab, setActiveTab] = useState("ai");
  const [errorMessage, setErrorMessage] = useState("");
  const [metadata, setMetadata] = useState(INITIAL_METADATA);

  const [notes, setNotes] = useState("");
  const [focusTopics, setFocusTopics] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingNotes, setIsUploadingNotes] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [accessCodes, setAccessCodes] = useState([]);

  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [requestedCount, setRequestedCount] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const [manualQuestions, setManualQuestions] = useState(() => [emptyQuestion()]);
  const [uploadingCid, setUploadingCid] = useState(null);

  const tabRefs = useRef({});

  const setField = (field) => (value) => {
    setErrorMessage("");
    setMetadata((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!isReviewing || generatedQuiz) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isReviewing, generatedQuiz]);

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
      ? readInt(metadata.numQuestions, "Number of questions", 1, MAX_QUESTIONS)
      : { value: 0 };
    const numStudents = readInt(metadata.numStudents, "Number of students", 1, MAX_STUDENTS);
    const timeLimit = readInt(metadata.timeLimit, "Time limit", minTime, maxTime);
    const bad = [numQuestions, numStudents, timeLimit].find((r) => r.error);
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

    for (const file of files) {
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
      setManualQuestions((prev) => prev.map((q) => (q.cid === cid ? { ...q, imageUrl: res.data.imageUrl } : q)));
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

    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/quiz/generate-ai-preview", {
        notes,
        focusTopics: focusTopics.trim(),
        difficulty: s.value.difficulty,
        numQuestions: s.value.numQuestions,
      });
      const questions = normalizeQuestions(res.data?.data?.questions);
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
        layoutMode: settings.layoutMode,
        showAnswersAfterSubmission: settings.showAnswersAfterSubmission,
        questions,
        useAIAutocomplete: false,
      });
      setGeneratedQuiz(res.data.data);
      setAccessCodes(res.data.accessCodes ?? []);
      setIsReviewing(false);
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

  // ✅ NEW: Add a blank custom question to the AI review list
  const addQuestionToPreview = () => {
    setPreviewQuestions((prev) => [
      ...prev,
      {
        cid: `manual-${Date.now()}`,
        question: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
      },
    ]);
  };

  const updateManualQuestion = (cid, patch) =>
    setManualQuestions((prev) => prev.map((q) => (q.cid === cid ? { ...q, ...patch } : q)));

  const updateOption = (cid, optIdx, value) =>
    setManualQuestions((prev) =>
      prev.map((q) =>
        q.cid === cid ? { ...q, options: q.options.map((o, i) => (i === optIdx ? value : o)) } : q
      )
    );

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

  const resetAll = () => {
    setGeneratedQuiz(null);
    setAccessCodes([]);
    setPreviewQuestions([]);
    setRequestedCount(null);
    setManualQuestions([emptyQuestion()]);
    setNotes("");
    setIsReviewing(false);
    setErrorMessage("");
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

  const locked = !!generatedQuiz || isGenerating;
  const isAI = activeTab === "ai";

  return (
    <div className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-foreground">Quiz manager</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground ${focusRing}`}
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>
        </div>

        <ErrorNote>{errorMessage}</ErrorNote>

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
                <Field label="Number of questions" htmlFor="quiz-questions" hint={`1 to ${MAX_QUESTIONS}. The AI may return fewer.`}>
                  <NumberInput id="quiz-questions" aria-describedby="quiz-questions-hint" value={metadata.numQuestions} onChange={setField("numQuestions")} placeholder="e.g., 5" />
                </Field>
              ) : (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-foreground">Number of questions</p>
                  <div className="rounded-xl border border-border bg-muted px-3.5 py-2.5 text-foreground">
                    {manualQuestions.length} (counted from the questions you add)
                  </div>
                </div>
              )}

              <Field label="Number of students (codes)" htmlFor="quiz-students" hint={`1 to ${MAX_STUDENTS}. One access code is created per student.`}>
                <NumberInput id="quiz-students" aria-describedby="quiz-students-hint" value={metadata.numStudents} onChange={setField("numStudents")} placeholder="e.g., 30" />
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
              Check every answer before you create the quiz. Use the pencil to fix a question or its correct answer.
              {requestedCount !== null && previewQuestions.length !== requestedCount && <> You asked for {requestedCount}.</>}
            </p>

            {/* ✅ NEW: Add Custom Question Button */}
            <button
              onClick={addQuestionToPreview}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/50 bg-brand/5 py-3 text-sm font-semibold text-brand transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Plus className="h-4 w-4" /> Add Custom Question
            </button>

            <QuestionReviewList questions={previewQuestions} onChange={setPreviewQuestions} />

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button onClick={() => { setIsReviewing(false); setErrorMessage(""); }} disabled={isGenerating} className={`${secondaryBtn} flex-1`}>
                Back to notes
              </button>
              <button onClick={handleFinalizeQuiz} disabled={isGenerating || previewQuestions.length === 0} className={`${primaryBtn} flex-1`}>
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Create quiz and get codes
              </button>
            </div>
          </div>
        )}

        {isAI && !isReviewing && !generatedQuiz && (
          <div role="tabpanel" id="panel-ai" aria-labelledby="tab-ai" className={`${card} space-y-4`}>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Sparkles className="h-5 w-5 text-brand" /> AI question generator
            </h2>
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
                    <span className="text-sm font-medium text-foreground">Reading your files…</span>
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
            <p className={`text-right text-xs ${notes.length > NOTES_MAX ? "text-destructive" : "text-muted-foreground"}`}>
              {notes.length.toLocaleString()} / {NOTES_MAX.toLocaleString()} characters
            </p>
            <Field label="Specific Topics to Focus On (Optional)" htmlFor="quiz-topics" hint="e.g., Photosynthesis, Chapter 3. Leave blank to use the whole note.">
  <input
    id="quiz-topics"
    type="text"
    placeholder="e.g., Topic 1, Topic 2"
    value={focusTopics}
    onChange={(e) => setFocusTopics(e.target.value)}
    className={inputCls}
  />
</Field>
            <button onClick={handleAIGenerate} disabled={isGenerating || isUploadingNotes || !notes.trim()} className={`${primaryBtn} w-full`}>
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {isGenerating ? "Generating…" : "Generate questions for review"}
            </button>
          </div>
        )}

        {!isAI && !generatedQuiz && (
          <div role="tabpanel" id="panel-manual" aria-labelledby="tab-manual" className="space-y-4">
            {manualQuestions.map((q, idx) => (
              <div key={q.cid} className={`${card} space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-3 font-semibold text-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{idx + 1}</span>
                    Question {idx + 1}
                  </h3>
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

                <input
                  type="text"
                  aria-label={`Question ${idx + 1} text`}
                  placeholder="Question text"
                  value={q.question}
                  onChange={(e) => { setErrorMessage(""); updateManualQuestion(q.cid, { question: e.target.value }); }}
                  className={inputCls}
                />

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Select the circle next to the correct answer.</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctOptionIndex === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2.5 rounded-xl border p-2 transition-colors ${
                            isCorrect ? "border-green-500/50 bg-green-500/10" : "border-transparent"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.cid}`}
                            aria-label={`Mark option ${String.fromCharCode(65 + optIdx)} as correct`}
                            checked={isCorrect}
                            onChange={() => updateManualQuestion(q.cid, { correctOptionIndex: optIdx })}
                            className="h-4 w-4 shrink-0 accent-brand"
                          />
                          <input
                            type="text"
                            aria-label={`Option ${String.fromCharCode(65 + optIdx)}`}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            value={opt}
                            onChange={(e) => { setErrorMessage(""); updateOption(q.cid, optIdx, e.target.value); }}
                            className={`${inputCls} min-w-0 flex-1 py-2 text-sm`}
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
              onClick={() => setManualQuestions((prev) => [...prev, emptyQuestion()])}
              disabled={manualQuestions.length >= MAX_QUESTIONS}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 font-semibold text-muted-foreground transition hover:border-brand/50 hover:text-brand disabled:opacity-50 ${focusRing}`}
            >
              <Plus className="h-4 w-4" /> Add question
            </button>
            <button onClick={handleCreateManualQuiz} disabled={isGenerating || uploadingCid !== null} className={`${primaryBtn} w-full py-4 text-lg`}>
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
              <button onClick={resetAll} className={`${secondaryBtn} py-2 text-sm`}>
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
              </div>
            </div>

            <button
              onClick={() => navigate("/admin/quiz-results")}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-brand/20 bg-brand-soft py-3 font-semibold text-brand transition hover:bg-brand/20 ${focusRing}`}
            >
              View quiz results
            </button>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <Users className="h-4 w-4" /> Student access codes ({accessCodes.length})
                </h3>
                <button
                  onClick={() => handleCopy(accessCodes.join("\n"), "all")}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-accent ${focusRing}`}
                >
                  {copiedKey === "all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedKey === "all" ? "Copied" : "Copy all"}
                </button>
              </div>
              <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-border bg-background p-2 sm:grid-cols-4 md:grid-cols-5">
                {accessCodes.map((code, idx) => (
                  <CodeChip key={`${code}-${idx}`} code={code} copied={copiedKey === `code-${idx}`} onCopy={() => handleCopy(code, `code-${idx}`)} />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Share these codes with your students. Each code can only be used once.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
