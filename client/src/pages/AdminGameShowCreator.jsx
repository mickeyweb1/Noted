import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, FileText, Plus, Trash2, Sparkles, Loader2, CheckCircle2, Copy, Users, Clock, AlertTriangle, ArrowLeft, ChevronDown, Check, Trophy } from "lucide-react";
import api from "../utils/api";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputCls = `w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand ${focusRing}`;
const card = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const secondaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition hover:bg-accent disabled:opacity-50 ${focusRing}`;

function Field({ label, htmlFor, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function SelectField({ id, value, onChange, label, children }) {
  return (
    <div className="relative">
      <select id={id} aria-label={label} value={value} onChange={onChange} className={`${inputCls} appearance-none pr-10`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export default function AdminGameShowCreator() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  
  const [metadata, setMetadata] = useState({
    title: "", 
    difficulty: "Intermediate", 
    numQuestions: 10, 
    numStudents: 30,
    timeLimit: 30, // Default to 30 seconds per question for game shows
    timeUnit: "seconds", 
    timeType: "perQuestion", // Game shows are always per question
    baseMarks: 10,
    bonusMarks: 5,
  });

  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [accessCodes, setAccessCodes] = useState([]);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);

  const handleMetadataChange = (field, value) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const validateMetadata = () => {
    if (!metadata.title) return "Please enter a game show title.";
    if (!metadata.numQuestions || Number(metadata.numQuestions) < 1) return "Number of questions must be at least 1.";
    if (!metadata.numStudents || Number(metadata.numStudents) < 1) return "Number of students must be at least 1.";
    return null;
  };

  const handleAIGenerate = async () => {
    const metaError = validateMetadata();
    if (metaError) return setErrorMessage(metaError);
    if (!notes.trim()) return setErrorMessage("Please enter the topic or notes for the AI to generate questions from.");
    
    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/quiz/generate-ai-preview", { 
        notes, 
        difficulty: metadata.difficulty, 
        numQuestions: metadata.numQuestions 
      });
      setPreviewQuestions(res.data.data.questions);
      setIsReviewing(true);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to generate quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalizeQuiz = async () => {
    const metaError = validateMetadata();
    if (metaError) return setErrorMessage(metaError);
    if (previewQuestions.length === 0) return setErrorMessage("No questions to finalize.");
    
    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/quiz/create-manual", {
        ...metadata,
        gameMode: "gameShow", // ✅ CRITICAL: Tells the backend this is a game show
        numQuestions: previewQuestions.length,
        questions: previewQuestions,
      });
      setGeneratedQuiz(res.data.data);
      setAccessCodes(res.data.accessCodes);
      setIsReviewing(false);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to create game show.");
    } finally {
      setIsGenerating(false);
    }
  };

  const removePreviewQuestion = (index) => {
    setPreviewQuestions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Trophy className="h-8 w-8 text-brand" /> Game Show Creator
            </h1>
            <p className="text-muted-foreground mt-1">Create a live, oral classroom quiz with steal mechanics.</p>
          </div>
          <button onClick={() => navigate("/admin/quizzes")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground ${focusRing}`}>
            <ArrowLeft className="h-4 w-4" /> Back to formal quizzes
          </button>
        </div>

        <ErrorNote>{errorMessage}</ErrorNote>

        {/* Shared Metadata Form */}
        <div className={`${card} space-y-5`}>
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand" /> Game Show Settings
            </h2>
            <p className="text-sm text-muted-foreground">Set the rules for your live classroom game.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Game Show Title" htmlFor="quiz-title" className="md:col-span-2">
              <input id="quiz-title" type="text" placeholder="e.g., Photosynthesis Live Battle" value={metadata.title} onChange={(e) => { setErrorMessage(""); handleMetadataChange("title", e.target.value); }} className={inputCls} />
            </Field>
            <Field label="Difficulty" htmlFor="quiz-difficulty">
              <SelectField id="quiz-difficulty" value={metadata.difficulty} onChange={(e) => handleMetadataChange("difficulty", e.target.value)}>
                <option>Basic</option><option>Intermediate</option><option>Hard</option><option>Max</option>
              </SelectField>
            </Field>
            <Field label="Number of Questions" htmlFor="quiz-questions">
              <input id="quiz-questions" type="number" min="1" value={metadata.numQuestions} onChange={(e) => { setErrorMessage(""); handleMetadataChange("numQuestions", e.target.value); }} className={inputCls} placeholder="e.g., 10" />
            </Field>
            <Field label="Number of Access Codes" htmlFor="quiz-students">
              <input id="quiz-students" type="number" min="1" value={metadata.numStudents} onChange={(e) => { setErrorMessage(""); handleMetadataChange("numStudents", e.target.value); }} className={inputCls} placeholder="e.g., 30" />
            </Field>
            <Field label="Time per Question (Seconds)" htmlFor="quiz-time">
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="quiz-time" type="number" min="5" value={metadata.timeLimit} onChange={(e) => { setErrorMessage(""); handleMetadataChange("timeLimit", e.target.value); }} className={`${inputCls} pl-10`} />
              </div>
            </Field>
            <Field label="Base Marks (Correct)" htmlFor="base-marks">
              <input id="base-marks" type="number" min="1" value={metadata.baseMarks} onChange={(e) => { setErrorMessage(""); handleMetadataChange("baseMarks", e.target.value); }} className={inputCls} />
            </Field>
            <Field label="Bonus Marks (Steal)" htmlFor="bonus-marks" className="md:col-span-2">
              <input id="bonus-marks" type="number" min="1" value={metadata.bonusMarks} onChange={(e) => { setErrorMessage(""); handleMetadataChange("bonusMarks", e.target.value); }} className={inputCls} placeholder="Points awarded if the next student steals a wrong answer" />
            </Field>
          </div>
        </div>

        {/* REVIEW STEP */}
        {isReviewing && (
          <div className="space-y-4 rounded-2xl border border-brand/30 bg-card p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-brand" /> Review generated questions
              </h2>
              <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">{previewQuestions.length} questions</span>
            </div>
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {previewQuestions.map((q, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-muted p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{idx + 1}</span>
                    <p className="min-w-0 flex-1 break-words pt-0.5 font-medium text-foreground">{q.question}</p>
                    <button onClick={() => removePreviewQuestion(idx)} aria-label={`Remove question ${idx + 1}`} className="rounded-lg p-2 text-destructive transition hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = opt === q.correctAnswer;
                      return (
                        <div key={optIdx} className={`flex items-start gap-2 rounded-lg border p-2.5 ${isCorrect ? "border-green-500/40 bg-green-500/10 font-medium text-green-700 dark:text-green-400" : "border-border bg-background text-muted-foreground"}`}>
                          <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                          <span className="min-w-0 flex-1 break-words">{opt}</span>
                          {isCorrect && <Check className="h-4 w-4 shrink-0" aria-label="Correct answer" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button onClick={() => { setIsReviewing(false); setErrorMessage(""); }} className={`${secondaryBtn} flex-1`}>
                Cancel and edit notes
              </button>
              <button onClick={handleFinalizeQuiz} disabled={isGenerating || previewQuestions.length === 0} className={`${primaryBtn} flex-1`}>
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} 
                Finalize & Generate Codes
              </button>
            </div>
          </div>
        )}

        {/* AI Generation Step */}
        {!isReviewing && !generatedQuiz && (
          <div className={`${card} space-y-4`}>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Brain className="h-5 w-5 text-brand" /> AI Question Generator</h2>
            <div className="relative">
              <textarea value={notes} onChange={(e) => { setErrorMessage(""); setNotes(e.target.value); }} rows={8} aria-label="Notes" placeholder="Paste the topic, textbook text, or lecture summary here for the AI to generate game show questions from..." className={`${inputCls} p-4 pr-16`} />
              {notes && <button onClick={() => setNotes("")} className={`absolute right-3 top-3 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:text-destructive ${focusRing}`}>Clear</button>}
            </div>
            <button onClick={handleAIGenerate} disabled={isGenerating || !notes.trim()} className={`${primaryBtn} w-full`}>
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Generate Questions for Review
            </button>
          </div>
        )}

        {/* Generated Quiz & Codes View */}
        {generatedQuiz && (
          <div className="space-y-6 rounded-2xl border border-green-500/30 bg-green-500/5 p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground"><CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" /> Game Show Created!</h2>
              <button onClick={() => { setGeneratedQuiz(null); setAccessCodes([]); setPreviewQuestions([]); setNotes(""); setIsReviewing(false); setErrorMessage(""); }} className={`${secondaryBtn} py-2 text-sm`}>
                <Plus className="h-4 w-4" /> Create another
              </button>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <h3 className="mb-3 font-semibold text-foreground">{generatedQuiz.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">{generatedQuiz.questions.length} questions</span>
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand">{metadata.difficulty}</span>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-purple-600 dark:text-purple-400">Base: {metadata.baseMarks} pts | Steal: {metadata.bonusMarks} pts</span>
              </div>
            </div>

            <button onClick={() => navigate(`/game-show?code=${accessCodes[0]}`)} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-brand/20 bg-brand-soft py-3 font-semibold text-brand transition hover:bg-brand/20 ${focusRing}`}>
              <Trophy className="h-5 w-5" /> Open Live Game Show Board
            </button>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-foreground"><Users className="h-4 w-4" /> Student Access Codes ({accessCodes.length})</h3>
                <button onClick={() => navigator.clipboard.writeText(accessCodes.join('\n'))} className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-accent ${focusRing}`}>
                  <Copy className="h-3.5 w-3.5" /> Copy all
                </button>
              </div>
              <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-border bg-background p-2 sm:grid-cols-4 md:grid-cols-5">
                {accessCodes.map((code, idx) => (<div key={idx} className="rounded-lg border border-border bg-muted p-2 text-center font-mono text-sm tracking-wider text-foreground">{code}</div>))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Share these codes with your students. Each code can only be used once.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
