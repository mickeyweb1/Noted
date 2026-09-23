import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, FileText, Plus, Trash2, Sparkles, Loader2, CheckCircle2, Copy, Users, Clock, Image as ImageIcon, Upload, AlertTriangle, ArrowLeft, ChevronDown, Check } from "lucide-react";
import api from "../utils/api";

/* ---------- Presentational helpers ---------- */
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputCls = `w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand ${focusRing}`;
const card = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const secondaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition hover:bg-accent disabled:opacity-50 ${focusRing}`;
const iconBtnDanger = `rounded-lg p-2 text-destructive transition hover:bg-destructive/10 ${focusRing}`;

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

/* ---------- Main Component ---------- */
export default function AdminQuizGenerator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ai"); 
  const [errorMessage, setErrorMessage] = useState(""); // ✅ Fix 5: Replaces alert()
  
  const [metadata, setMetadata] = useState({
    title: "", difficulty: "Intermediate", numQuestions: 5, numStudents: 30,
    timeLimit: 10, timeUnit: "minutes", timeType: "total", maxTabSwitches: ""
  });

  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [accessCodes, setAccessCodes] = useState([]);
  
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);

  // ✅ Fix 1 & 5: Use correctOptionIndex instead of string to prevent edit/duplicate bugs
  const [manualQuestions, setManualQuestions] = useState([{
    question: "", options: ["", "", "", ""], correctOptionIndex: null, explanation: "", imageUrl: ""
  }]);
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(null);
  const [isUploadingNotes, setIsUploadingNotes] = useState(false);

  // ✅ Fix 4: Strict number validation
  const handleMetadataChange = (field, value) => {
    if (['numQuestions', 'numStudents', 'timeLimit', 'maxTabSwitches'].includes(field)) {
      if (value === "") {
        setMetadata(prev => ({ ...prev, [field]: "" }));
        return;
      }
      const num = Number(value);
      if (!isNaN(num) && num >= 1) {
        setMetadata(prev => ({ ...prev, [field]: num }));
      }
    } else {
      setMetadata(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateMetadata = () => {
    if (!metadata.title) return "Please enter a quiz title.";
    if (!metadata.numQuestions || Number(metadata.numQuestions) < 1) return "Number of questions must be at least 1.";
    if (!metadata.numStudents || Number(metadata.numStudents) < 1) return "Number of students must be at least 1.";
    if (!metadata.timeLimit || Number(metadata.timeLimit) < 1) return "Time limit must be at least 1.";
    return null;
  };

  // ✅ Fix 3: Handle OCR failures explicitly
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsUploadingNotes(true);
    setErrorMessage("");
    let extractedText = "";
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === "text/plain") {
          extractedText += `\n\n--- 📄 File: ${file.name} ---\n${await file.text()}`;
        } else if (file.type.startsWith("image/")) {
          const base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(file);
          });
          const res = await api.post("/ai/ocr/extract-text", { imageUrl: base64Image });
          if (res.data.success) {
            extractedText += `\n\n--- 📷 Image ${i + 1}: ${file.name} ---\n${res.data.text}`;
          } else {
            setErrorMessage(`Failed to extract text from image: ${file.name}. Please try a clearer picture.`);
          }
        }
      }
      if (extractedText) setNotes((prev) => prev + (prev ? "\n" : "") + extractedText);
    } catch (err) {
      setErrorMessage("Failed to process one or more files.");
    } finally {
      setIsUploadingNotes(false);
      e.target.value = "";
    }
  };

  // ✅ Fix 2: Immutable state update
  const handleImageUpload = async (questionIndex, file) => {
    if (!file) return;
    setUploadingQuestionImage(questionIndex);
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/quiz/upload/quiz-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      setManualQuestions(prev => prev.map((q, i) => 
        i === questionIndex ? { ...q, imageUrl: res.data.imageUrl } : q
      ));
    } catch (err) {
      setErrorMessage("Failed to upload image.");
    } finally {
      setUploadingQuestionImage(null);
    }
  };

  const handleAIGenerate = async () => {
    const metaError = validateMetadata();
    if (metaError) return setErrorMessage(metaError);
    if (!notes.trim()) return setErrorMessage("Please enter or upload notes.");
    
    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/quiz/generate-ai-preview", { 
        notes, difficulty: metadata.difficulty, numQuestions: metadata.numQuestions 
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
        numQuestions: previewQuestions.length,
        maxTabSwitches: metadata.maxTabSwitches ? Number(metadata.maxTabSwitches) : null,
        questions: previewQuestions,
        useAIAutocomplete: false
      });
      setGeneratedQuiz(res.data.data);
      setAccessCodes(res.data.accessCodes);
      setIsReviewing(false);
      setActiveTab("ai"); 
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to create quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  const removePreviewQuestion = (index) => {
    setPreviewQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ Fix 2: Immutable state update
  const addManualQuestion = () => {
    setManualQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correctOptionIndex: null, explanation: "", imageUrl: "" }]);
  };

  // ✅ Fix 2: Immutable state update
  const updateManualQuestion = (idx, field, value) => {
    setManualQuestions(prev => prev.map((q, i) => 
      i === idx ? { ...q, [field]: value } : q
    ));
  };

  // ✅ Fix 1, 2 & 5: Immutable update + index-based correctness
  const updateOption = (qIdx, optIdx, value) => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const newOptions = [...q.options];
      newOptions[optIdx] = value;
      return { ...q, options: newOptions };
    }));
  };

  const setCorrectOption = (qIdx, optIdx) => {
    setManualQuestions(prev => prev.map((q, i) => 
      i === qIdx ? { ...q, correctOptionIndex: optIdx } : q
    ));
  };

  const handleCreateManualQuiz = async () => {
    const metaError = validateMetadata();
    if (metaError) return setErrorMessage(metaError);
    
    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i];
      if (!q.question.trim()) return setErrorMessage(`Question ${i + 1} is missing text.`);
      if (q.options.some(opt => !opt.trim())) return setErrorMessage(`Question ${i + 1} is missing options.`);
      if (q.correctOptionIndex === null || q.correctOptionIndex === undefined) {
        return setErrorMessage(`Please select the correct answer for Question ${i + 1}.`);
      }
    }
    
    // ✅ Fix 1: Map the index back to the actual string for the backend
    const formattedQuestions = manualQuestions.map(q => ({
      ...q,
      correctAnswer: q.options[q.correctOptionIndex],
      correctOptionIndex: undefined // Remove UI-only field before sending
    }));

    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/quiz/create-manual", {
        ...metadata,
        numQuestions: formattedQuestions.length,
        maxTabSwitches: metadata.maxTabSwitches ? Number(metadata.maxTabSwitches) : null,
        questions: formattedQuestions,
        useAIAutocomplete: false
      });
      setGeneratedQuiz(res.data.data);
      setAccessCodes(res.data.accessCodes);
      setActiveTab("ai"); 
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to create quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  const tabCls = (active) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${focusRing} ${
      active ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-foreground">Quiz manager</h1>
          <button onClick={() => navigate("/dashboard")} className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground ${focusRing}`}>
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>
        </div>

        {/* Global Error Note */}
        <ErrorNote>{errorMessage}</ErrorNote>

        <div role="tablist" className="flex w-full gap-1 rounded-xl border border-border bg-card p-1 sm:w-fit">
          <button role="tab" aria-selected={activeTab === "ai"} onClick={() => { setActiveTab("ai"); setIsReviewing(false); setErrorMessage(""); }} className={tabCls(activeTab === "ai")}>
            <Brain className="h-4 w-4" /> AI generate
          </button>
          <button role="tab" aria-selected={activeTab === "manual"} onClick={() => { setActiveTab("manual"); setIsReviewing(false); setErrorMessage(""); }} className={tabCls(activeTab === "manual")}>
            <FileText className="h-4 w-4" /> Manual
          </button>
        </div>

        {/* Shared Metadata Form */}
        <div className={`${card} space-y-5`}>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Quiz settings</h2>
            <p className="text-sm text-muted-foreground">These apply to both AI and manual quizzes.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Quiz title" htmlFor="quiz-title" className="md:col-span-2">
              <input id="quiz-title" type="text" placeholder="e.g., Photosynthesis midterm" value={metadata.title} onChange={(e) => { setErrorMessage(""); handleMetadataChange("title", e.target.value); }} className={inputCls} />
            </Field>
            <Field label="Difficulty" htmlFor="quiz-difficulty">
              <SelectField id="quiz-difficulty" value={metadata.difficulty} onChange={(e) => handleMetadataChange("difficulty", e.target.value)}>
                <option>Basic</option><option>Intermediate</option><option>Hard</option><option>Max</option>
              </SelectField>
            </Field>
            <Field label="Number of questions" htmlFor="quiz-questions">
              <input id="quiz-questions" type="number" min="1" value={metadata.numQuestions} onChange={(e) => { setErrorMessage(""); handleMetadataChange("numQuestions", e.target.value); }} className={inputCls} placeholder="e.g., 5" />
            </Field>
            <Field label="Number of students (codes)" htmlFor="quiz-students">
              <input id="quiz-students" type="number" min="1" value={metadata.numStudents} onChange={(e) => { setErrorMessage(""); handleMetadataChange("numStudents", e.target.value); }} className={inputCls} placeholder="e.g., 30" />
            </Field>
            <Field label="Max tab switches (optional)" htmlFor="quiz-tabs">
              <input id="quiz-tabs" type="number" min="1" value={metadata.maxTabSwitches} onChange={(e) => { setErrorMessage(""); handleMetadataChange("maxTabSwitches", e.target.value); }} className={inputCls} placeholder="e.g., 6. Leave blank to disable" />
            </Field>
            <Field label="Time limit" htmlFor="quiz-time" className="md:col-span-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input id="quiz-time" type="number" min="1" value={metadata.timeLimit} onChange={(e) => { setErrorMessage(""); handleMetadataChange("timeLimit", e.target.value); }} className={`${inputCls} pl-10`} />
                </div>
                <SelectField label="Time unit" value={metadata.timeUnit} onChange={(e) => handleMetadataChange("timeUnit", e.target.value)}>
                  <option value="seconds">seconds</option><option value="minutes">minutes</option>
                </SelectField>
                <SelectField label="Time applies to" value={metadata.timeType} onChange={(e) => handleMetadataChange("timeType", e.target.value)}>
                  <option value="total">total</option><option value="perQuestion">per question</option>
                </SelectField>
              </div>
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
                    <button onClick={() => removePreviewQuestion(idx)} aria-label={`Remove question ${idx + 1}`} className={iconBtnDanger}>
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
                Finalize and generate codes
              </button>
            </div>
          </div>
        )}

        {/* AI Tab */}
        {activeTab === "ai" && !isReviewing && !generatedQuiz && (
          <div className={`${card} space-y-4`}>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Sparkles className="h-5 w-5 text-brand" /> AI question generator</h2>
            <div>
              <input type="file" multiple accept=".txt, image/png, image/jpeg, image/jpg" onChange={handleFileUpload} disabled={isUploadingNotes} className="peer sr-only" id="quiz-file-upload" />
              <label htmlFor="quiz-file-upload" className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 text-center transition hover:border-brand/50 hover:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {isUploadingNotes ? (
                  <><Loader2 className="h-8 w-8 animate-spin text-brand" /><span className="text-sm font-medium text-foreground">Processing files...</span></>
                ) : (
                  <><div className="rounded-full bg-brand-soft p-3 text-brand"><Upload className="h-6 w-6" /></div>
                  <span className="text-sm font-medium text-foreground">Upload your notes</span>
                  <span className="text-xs text-muted-foreground">Select several images or .txt files at once</span></>
                )}
              </label>
            </div>
            <div className="relative">
              <textarea value={notes} onChange={(e) => { setErrorMessage(""); setNotes(e.target.value); }} rows={8} aria-label="Notes" placeholder="Or paste your notes, textbook text, or lecture summary here..." className={`${inputCls} p-4 pr-16`} />
              {notes && <button onClick={() => setNotes("")} className={`absolute right-3 top-3 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:text-destructive ${focusRing}`}>Clear</button>}
            </div>
            <button onClick={handleAIGenerate} disabled={isGenerating || !notes.trim()} className={`${primaryBtn} w-full`}>
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Generate questions for review
            </button>
          </div>
        )}

        {/* Manual Tab */}
        {activeTab === "manual" && !generatedQuiz && (
          <div className="space-y-4">
            {manualQuestions.map((q, idx) => (
              <div key={idx} className={`${card} space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-3 font-semibold text-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{idx + 1}</span>
                    Question {idx + 1}
                  </h3>
                  {manualQuestions.length > 1 && (
                    <button onClick={() => setManualQuestions(prev => prev.filter((_, i) => i !== idx))} aria-label={`Remove question ${idx + 1}`} className={iconBtnDanger}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input id={`q-img-${idx}`} type="file" accept="image/*" onChange={(e) => handleImageUpload(idx, e.target.files[0])} className="peer sr-only" />
                  <label htmlFor={`q-img-${idx}`} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition hover:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                    <ImageIcon className="h-4 w-4" /> {q.imageUrl ? "Replace image" : "Add image"}
                  </label>
                  {uploadingQuestionImage === idx && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {q.imageUrl && (
                    <>
                      <img src={q.imageUrl} alt="" className="h-10 w-10 rounded-md border border-border object-cover" />
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"><Check className="h-3.5 w-3.5" /> Image attached</span>
                    </>
                  )}
                </div>

                <input type="text" aria-label={`Question ${idx + 1} text`} placeholder="Question text" value={q.question} onChange={(e) => { setErrorMessage(""); updateManualQuestion(idx, "question", e.target.value); }} className={inputCls} />

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Select the circle next to the correct answer.</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctOptionIndex === optIdx;
                      return (
                        <div key={optIdx} className={`flex items-center gap-2.5 rounded-xl border p-2 transition-colors ${isCorrect ? "border-green-500/50 bg-green-500/10" : "border-transparent"}`}>
                          <input 
                            type="radio" 
                            name={`correct-${idx}`} 
                            aria-label={`Mark option ${String.fromCharCode(65 + optIdx)} as correct`} 
                            checked={isCorrect} 
                            onChange={() => setCorrectOption(idx, optIdx)} 
                            className="h-4 w-4 shrink-0 accent-brand" 
                          />
                          <input 
                            type="text" 
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} 
                            value={opt} 
                            onChange={(e) => { setErrorMessage(""); updateOption(idx, optIdx, e.target.value); }} 
                            className={`${inputCls} min-w-0 flex-1 py-2 text-sm`} 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <input type="text" aria-label="Explanation" placeholder="Explanation (optional)" value={q.explanation} onChange={(e) => { setErrorMessage(""); updateManualQuestion(idx, "explanation", e.target.value); }} className={`${inputCls} text-sm`} />
              </div>
            ))}

            <button onClick={addManualQuestion} className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 font-semibold text-muted-foreground transition hover:border-brand/50 hover:text-brand ${focusRing}`}>
              <Plus className="h-4 w-4" /> Add question
            </button>
            <button onClick={handleCreateManualQuiz} disabled={isGenerating} className={`${primaryBtn} w-full py-4 text-lg`}>
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Create quiz and generate codes
            </button>
          </div>
        )}

        {/* Generated Quiz & Codes View */}
        {generatedQuiz && (
          <div className="space-y-6 rounded-2xl border border-green-500/30 bg-green-500/5 p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground"><CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" /> Quiz created</h2>
              <button onClick={() => { setGeneratedQuiz(null); setAccessCodes([]); setPreviewQuestions([]); setManualQuestions([{ question: "", options: ["", "", "", ""], correctOptionIndex: null, explanation: "", imageUrl: "" }]); setNotes(""); setIsReviewing(false); setErrorMessage(""); }} className={`${secondaryBtn} py-2 text-sm`}>
                <Plus className="h-4 w-4" /> Create another
              </button>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <h3 className="mb-3 font-semibold text-foreground">{generatedQuiz.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">{generatedQuiz.questions.length} questions</span>
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand">{metadata.difficulty}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">{metadata.timeLimit} {metadata.timeUnit}, {metadata.timeType === "perQuestion" ? "per question" : "total"}</span>
              </div>
            </div>

            <button onClick={() => navigate(`/admin/quiz-results`)} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-brand/20 bg-brand-soft py-3 font-semibold text-brand transition hover:bg-brand/20 ${focusRing}`}>
              View quiz results
            </button>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-foreground"><Users className="h-4 w-4" /> Student access codes ({accessCodes.length})</h3>
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
