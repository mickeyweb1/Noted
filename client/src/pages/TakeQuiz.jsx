import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Loader2, User, School, ArrowRight, AlertTriangle, Check, ListChecks } from "lucide-react";
import api from "../utils/api";

/* ---------- Presentational helpers ---------- */
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputCls = `w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand ${focusRing}`;
const primaryBtn = `w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const shell = "min-h-screen flex items-center justify-center bg-muted p-4";
const panel = "w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8";

function Stepper({ current }) {
  const steps = ["Code", "Your details", "Quiz"];
  return (
    <ol className="mb-6 flex items-center justify-center gap-2 text-xs font-medium">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${done ? "bg-brand text-brand-foreground" : active ? "bg-brand-soft text-brand ring-2 ring-brand" : "bg-muted text-muted-foreground"}`}>
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`${active ? "text-foreground" : "hidden text-muted-foreground sm:inline"}`}>{label}</span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-border" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/* ---------- Main Component ---------- */
export default function TakeQuiz() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [step, setStep] = useState("validate");
  const [code, setCode] = useState(location.state?.code || "");
  
  const [quizData, setQuizData] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ name: "", surname: "", className: "" });
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [maxTabSwitches, setMaxTabSwitches] = useState(null);
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState(false); // ✅ Fix 6: Custom modal
  
  const timerRef = useRef(null);
  const answersRef = useRef({}); // ✅ Fix 1: Always hold latest answers

  // Keep ref synced with state
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // ✅ Fix 1 & 6: Tab Switch Detection with Modal
  useEffect(() => {
    if (step !== "quiz") return;
    
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        try {
          const res = await api.post("/quiz/session/update-tab", { code });
          setTabSwitchCount(res.data.tabSwitchCount);
          if (res.data.shouldAutoSubmit) {
            setShowAutoSubmitModal(true);
            // Give them 2 seconds to read the modal, then auto-submit
            setTimeout(() => {
              setShowAutoSubmitModal(false);
              handleSubmitQuiz(true);
            }, 2000);
          }
        } catch (err) {
          console.error("Failed to update tab count", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [step, code]);

  // ✅ Fix 4: Handle 0 time left properly
  useEffect(() => {
    if (step !== "quiz") return;
    
    if (timeLeft <= 0) {
      handleSubmitQuiz(true);
      return;
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerRef.current);
  }, [step, timeLeft]);

  const handleValidateCode = async (e) => {
    e.preventDefault();
    if (code.length !== 10) return setError("Code must be 10 characters");
    setError("");
    
    try {
      // Just validate the code format and fetch quiz data. 
      // We do NOT start the timer here anymore.
      const res = await api.post("/quiz/validate-code", { code });
      const data = res.data.data;
      setQuizData(data);
      setMaxTabSwitches(data.maxTabSwitches);
      
      // Show total time on the info screen, but don't start countdown yet
      const totalSeconds = data.timeType === "perQuestion" 
        ? data.timeLimit * data.questions.length 
        : data.timeLimit;
      const multiplier = data.timeUnit === "minutes" ? 60 : 1;
      setTimeLeft(totalSeconds * multiplier);
      
      setStep("info");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or already used code.");
    }
  };

  // ✅ Fix 3: Start the server session ONLY when they click "Start Quiz"
  const handleStartQuiz = async (e) => {
    e.preventDefault();
    if (!studentInfo.name || !studentInfo.surname) return setError("Please enter your name and surname.");
    setError("");
    setIsSubmitting(true); // Show loading while starting session
    
    try {
      const res = await api.post("/quiz/session/start", { code });
      const data = res.data.data;
      
      // Now calculate the real countdown based on server start time
      const totalSeconds = data.timeType === "perQuestion" 
        ? data.timeLimit * data.questions.length 
        : data.timeLimit;
      const multiplier = data.timeUnit === "minutes" ? 60 : 1;
      const endTime = new Date(data.startTime).getTime() + (totalSeconds * multiplier * 1000);
      const initialTimeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      
      setTimeLeft(initialTimeLeft);
      setStep("quiz");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start quiz session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAnswer = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = async (isAuto = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    clearInterval(timerRef.current);
    
    // ✅ Fix 1: Use answersRef.current to guarantee we have the latest answers
    const formattedAnswers = quizData.questions.map(q => ({
      questionId: q._id,
      selectedAnswer: answersRef.current[q._id] || null
    }));

    try {
      const res = await api.post("/quiz/submit", {
        code,
        studentName: studentInfo.name,
        studentSurname: studentInfo.surname,
        studentClass: studentInfo.className,
        answers: formattedAnswers
      });
      setResult(res.data);
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit quiz.");
      // ✅ Fix 2: Always reset isSubmitting on error so they aren't stuck
      setIsSubmitting(false); 
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalQuestions = quizData ? quizData.questions.length : 0;
  const answeredCount = quizData ? quizData.questions.filter((q) => answers[q._id]).length : 0;
  const progress = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;
  
  // ✅ Fix 5: Prevent NaN%
  const percentage = result && result.totalQuestions > 0 
    ? Math.round((result.score / result.totalQuestions) * 100) 
    : 0;
  const isPassing = percentage >= 50;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  /* ---------- Step 1: Enter code ---------- */
  if (step === "validate") {
    return (
      <div className={shell}>
        <div className={`${panel} text-center`}>
          <Stepper current={0} />
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft">
            <ListChecks className="h-8 w-8 text-brand" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Join a quiz</h1>
          <p className="mb-6 text-muted-foreground">Enter the 10-character code your teacher gave you.</p>
          <form onSubmit={handleValidateCode} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10))}
              placeholder="0000000000"
              aria-label="Quiz code"
              className="w-full rounded-2xl border-2 border-input bg-background p-4 text-center font-mono text-2xl tracking-[0.3em] text-foreground placeholder:text-muted-foreground/50 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand-soft"
            />
            <div className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < code.length ? "bg-brand" : "bg-border"}`} />
              ))}
            </div>
            <ErrorNote>{error}</ErrorNote>
            <button type="submit" disabled={code.length !== 10} className={primaryBtn}>
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ---------- Step 2: Student details ---------- */
  if (step === "info") {
    return (
      <div className={shell}>
        <div className={panel}>
          <Stepper current={1} />
          <div className="mb-5 flex items-start justify-between gap-3">
            <h1 className="min-w-0 break-words text-2xl font-bold text-foreground">{quizData.title}</h1>
            <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium capitalize text-brand">
              {quizData.difficulty}
            </span>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-muted p-3">
              <ListChecks className="mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-bold text-foreground">{totalQuestions}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div className="rounded-2xl bg-muted p-3">
              <Clock className="mb-1 h-4 w-4 text-muted-foreground" />
              <p className="font-mono text-lg font-bold text-foreground">{formatTime(timeLeft)}</p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </div>
          </div>

          <form onSubmit={handleStartQuiz} className="space-y-4">
            <div>
              <label htmlFor="first-name" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-muted-foreground" /> First name
              </label>
              <input id="first-name" type="text" value={studentInfo.name} onChange={(e) => setStudentInfo({...studentInfo, name: e.target.value})} className={inputCls} required />
            </div>
            <div>
              <label htmlFor="surname" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-muted-foreground" /> Surname
              </label>
              <input id="surname" type="text" value={studentInfo.surname} onChange={(e) => setStudentInfo({...studentInfo, surname: e.target.value})} className={inputCls} required />
            </div>
            <div>
              <label htmlFor="class-name" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                <School className="h-4 w-4 text-muted-foreground" /> Class <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input id="class-name" type="text" value={studentInfo.className} onChange={(e) => setStudentInfo({...studentInfo, className: e.target.value})} className={inputCls} placeholder="e.g., Grade 10A" />
            </div>
            <ErrorNote>{error}</ErrorNote>
            <button type="submit" disabled={isSubmitting} className={primaryBtn}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start quiz"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ---------- Step 3: Quiz ---------- */
  if (step === "quiz") {
    const lowTime = timeLeft < 60;
    const nearTabLimit = maxTabSwitches && tabSwitchCount >= maxTabSwitches - 2;

    return (
      <div className="min-h-screen bg-muted p-4 md:p-8">
        {/* ✅ Fix 6: Auto-Submit Modal */}
        {showAutoSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-card p-6 rounded-2xl border border-border shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Auto-Submitting Quiz</h3>
              <p className="text-muted-foreground mb-6">You have switched tabs too many times. Your quiz is being submitted now to preserve your current answers.</p>
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand" />
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-6">
          <div className="sticky top-4 z-10 rounded-2xl border border-border bg-card p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">{quizData.title}</h1>
                <p className="truncate text-sm text-muted-foreground">{studentInfo.name} {studentInfo.surname}</p>
              </div>
              <div role="timer" className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 font-mono text-base font-bold sm:px-4 sm:text-lg ${lowTime ? "bg-destructive/10 text-destructive motion-safe:animate-pulse" : "bg-brand-soft text-brand"}`}>
                <Clock className="h-5 w-5" /> {formatTime(timeLeft)}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={totalQuestions} aria-valuenow={answeredCount}>
                <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{answeredCount}/{totalQuestions} answered</span>
            </div>

            {maxTabSwitches && (
              <p className={`mt-3 flex items-center gap-1.5 text-xs ${nearTabLimit ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                <AlertTriangle className="h-3.5 w-3.5" /> Tab switches: {tabSwitchCount} / {maxTabSwitches}
              </p>
            )}
          </div>

          <div className="space-y-6">
            {quizData.questions.map((q, idx) => {
              const isAnswered = !!answers[q._id];
              return (
                <section key={q._id} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby={`q-${q._id}`}>
                  {q.imageUrl && <img src={q.imageUrl} alt="Question visual" className="mb-4 max-h-64 w-full rounded-xl border border-border bg-muted object-contain" />}
                  <div className="mb-4 flex items-start gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${isAnswered ? "bg-brand text-brand-foreground" : "bg-brand-soft text-brand"}`}>
                      {idx + 1}
                    </span>
                    <h3 id={`q-${q._id}`} className="min-w-0 break-words pt-0.5 text-lg font-semibold leading-snug text-foreground">{q.question}</h3>
                  </div>
                  <div className="space-y-3" role="group" aria-labelledby={`q-${q._id}`}>
                    {q.options.map((opt, optIdx) => {
                      const isSelected = answers[q._id] === opt;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleSelectAnswer(q._id, opt)}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${focusRing} ${isSelected ? "border-brand bg-brand-soft text-foreground" : "border-border bg-background text-foreground hover:border-brand/40 hover:bg-muted"}`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${isSelected ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="min-w-0 flex-1 break-words">{opt}</span>
                          {isSelected && <Check className="h-5 w-5 shrink-0 text-brand" />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 pb-6 text-center shadow-sm sm:p-6">
            <p className="text-sm text-muted-foreground">
              {answeredCount === totalQuestions ? "You've answered every question. Ready when you are." : `${totalQuestions - answeredCount} ${totalQuestions - answeredCount === 1 ? "question" : "questions"} still unanswered.`}
            </p>
            {/* ✅ Fix 2: Show errors on the quiz screen */}
            <ErrorNote>{error}</ErrorNote>
            <button onClick={() => handleSubmitQuiz(false)} disabled={isSubmitting} className={`${primaryBtn} text-lg`}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit quiz"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Step 4: Result ---------- */
  if (step === "result") {
    return (
      <div className={shell}>
        <div className={`${panel} text-center`}>
          <div className="relative mx-auto mb-5 h-44 w-44">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
              <circle
                cx="60" cy="60" r={radius} fill="none" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - percentage / 100)}
                className={`transition-all duration-700 ${isPassing ? "stroke-green-500" : "stroke-destructive"}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black ${isPassing ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>{percentage}%</span>
              <span className="text-sm text-muted-foreground">{result.score} of {result.totalQuestions}</span>
            </div>
          </div>

          <h1 className="mb-1 flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
            {isPassing ? <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" /> : <XCircle className="h-6 w-6 text-destructive" />}
            Quiz submitted
          </h1>
          <p className="mb-6 text-muted-foreground">Great effort, {studentInfo.name}.</p>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-muted p-3">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.score}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="rounded-2xl bg-muted p-3">
              <p className="text-2xl font-bold text-foreground">{result.totalQuestions - result.score}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
          </div>

          {result.tabSwitchCount > 0 && (
            <p className="mb-6 flex items-center justify-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Tab switches detected: {result.tabSwitchCount}
            </p>
          )}

          <button onClick={() => navigate("/")} className={primaryBtn}>Return to home</button>
        </div>
      </div>
    );
  }
}
