import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Loader2, User, School, ArrowRight, ArrowLeft, AlertTriangle, Check, ListChecks, WifiOff, Info } from "lucide-react";
import api from "../utils/api";
import MathRenderer from "../components/MathRenderer";

/* ---------- Shared styles ---------- */
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputCls = `w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand ${focusRing}`;
const btnBase = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const primaryBtn = `${btnBase} w-full bg-brand py-3.5 text-brand-foreground shadow-sm hover:bg-brand/90`;
const primaryBtnInline = `${btnBase} bg-brand px-5 py-3 text-brand-foreground shadow-sm hover:bg-brand/90`;
const secondaryBtn = `${btnBase} border border-border bg-background px-4 py-3 text-foreground hover:bg-accent`;
const shell = "flex min-h-dvh items-center justify-center bg-muted p-4";
const panel = "w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-xl sm:p-8";

const PENDING_PREFIX = "offline_submission_";
const TABCOUNT_PREFIX = "tabswitch_";

/* ---------- Helpers ---------- */
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const getTotalSeconds = (data) => {
  const total = data.timeType === "perQuestion" ? data.timeLimit * data.questions.length : data.timeLimit;
  return total * (data.timeUnit === "minutes" ? 60 : 1);
};

// Finds a submission that was saved on this device but never reached the server
const findPendingCode = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PENDING_PREFIX)) return key.slice(PENDING_PREFIX.length);
    }
  } catch { /* storage unavailable */ }
  return "";
};

// fetch + keepalive is allowed to finish even while the tab is closing or hidden (axios/XHR is not).
// Sent as application/json so the server actually parses it — navigator.sendBeacon with a string would arrive as text/plain.
const postKeepalive = (path, payload) => {
  try {
    const base = (api.defaults.baseURL || "").replace(/\/$/, "");
    fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch { /* best effort only */ }
};

/* ---------- Small components ---------- */
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
            <span className={active ? "text-foreground" : "hidden text-muted-foreground sm:inline"}>{label}</span>
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

// Horizontal strip of numbered chips: answered = filled, current = ringed.
function QuestionChips({ questions, answers, currentIndex, onJump }) {
  const containerRef = useRef(null);
  const chipRefs = useRef([]);

  useEffect(() => {
    const container = containerRef.current;
    const chip = chipRefs.current[currentIndex];
    if (!container || !chip) return;
    container.scrollTo({ left: chip.offsetLeft - container.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [currentIndex]);

  return (
    <nav ref={containerRef} aria-label="Question navigator" className="relative -mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
      {questions.map((q, i) => {
        const answered = Boolean(answers[q._id]);
        const current = i === currentIndex;
        return (
          <button
            key={q._id}
            ref={(el) => { chipRefs.current[i] = el; }}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Question ${i + 1}, ${answered ? "answered" : "not answered"}`}
            aria-current={current ? "true" : undefined}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition ${focusRing} ${
              current
                ? "bg-brand text-brand-foreground ring-2 ring-brand ring-offset-2 ring-offset-muted"
                : answered
                ? "bg-brand-soft text-brand"
                : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </nav>
  );
}

function QuestionCard({ question, number, selected, onSelect, id }) {
  const answered = Boolean(selected);
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6" aria-labelledby={`${id}-title`}>
      {question.imageUrl && (
        <img src={question.imageUrl} alt="Question visual" className="mb-4 max-h-64 w-full rounded-xl border border-border bg-muted object-contain" draggable="false" />
      )}
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${answered ? "bg-brand text-brand-foreground" : "bg-brand-soft text-brand"}`}>{number}</span>
        <h3 id={`${id}-title`} className="min-w-0 break-words pt-0.5 text-base font-semibold leading-snug text-foreground sm:text-lg">
          <MathRenderer>{question.question}</MathRenderer>
        </h3>
      </div>
      <div className="space-y-2.5 sm:space-y-3" role="group" aria-labelledby={`${id}-title`}>
        {question.options.map((opt, optIdx) => {
          const isSelected = selected === opt;
          return (
            <button
              key={optIdx}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(question._id, opt)}
              className={`flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${focusRing} ${
                isSelected ? "border-brand bg-brand-soft text-foreground" : "border-border bg-background text-foreground hover:border-brand/40 hover:bg-muted"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${isSelected ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}>
                {String.fromCharCode(65 + optIdx)}
              </span>
              <span className="min-w-0 flex-1 break-words"><MathRenderer>{opt}</MathRenderer></span>
              {isSelected && <Check className="h-5 w-5 shrink-0 text-brand" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ConfirmSubmitModal({ answered, total, busy, onConfirm, onCancel, onReview }) {
  const unanswered = total - answered;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:p-6">
        <h3 id="confirm-title" className="mb-1 text-lg font-bold text-foreground">Submit your quiz?</h3>
        <p className="mb-5 text-sm text-muted-foreground">
          {unanswered === 0
            ? "You've answered every question. You can't change your answers after submitting."
            : `You still have ${unanswered} unanswered ${unanswered === 1 ? "question" : "questions"}. You can't change your answers after submitting.`}
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onConfirm} disabled={busy} className={primaryBtn}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit now"}
          </button>
          {unanswered > 0 && (
            <button type="button" onClick={onReview} className={`${secondaryBtn} w-full`}>Review unanswered</button>
          )}
          <button type="button" onClick={onCancel} className={`${secondaryBtn} w-full border-transparent`}>Keep working</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function TakeQuiz() {
  const location = useLocation();
  const navigate = useNavigate();

  const [recoveredCode] = useState(findPendingCode);
  const [step, setStep] = useState("validate");
  const [code, setCode] = useState(location.state?.code || recoveredCode || "");
  const [quizData, setQuizData] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ name: "", surname: "", className: "" });
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [maxTabSwitches, setMaxTabSwitches] = useState(null);
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeToast, setTimeToast] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isValidating, setIsValidating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const timerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const retryIntervalRef = useRef(null);
  const answersRef = useRef({});
  const studentInfoRef = useRef(studentInfo);
  const quizDataRef = useRef(null);
  const endTimeRef = useRef(null);
  const tabCountRef = useRef(0);          // client-side tab-switch count: keeps counting even while offline
  const autoSubmitRef = useRef(false);    // the tab limit was hit — only trigger once
  const submittingRef = useRef(false);    // blocks double-submits (timer + button + tab limit can all fire)
  const syncingRef = useRef(false);
  const submitRef = useRef(() => {});     // always points at the latest submit handler (no stale closures)

  const pendingKey = `${PENDING_PREFIX}${code}`;
  const tabKey = `${TABCOUNT_PREFIX}${code}`;
  const isPaginated = quizData?.layoutMode === "paginated";

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { studentInfoRef.current = studentInfo; }, [studentInfo]);
  useEffect(() => { quizDataRef.current = quizData; }, [quizData]);

  // Saves everything needed to finish the quiz on this device (survives closing the tab / losing data)
  const stashPending = () => {
    try {
      localStorage.setItem(pendingKey, JSON.stringify({
        studentInfo: studentInfoRef.current,
        answers: answersRef.current,
        tabSwitchCount: tabCountRef.current,
        submittedAt: Date.now(),
      }));
    } catch { /* storage full/unavailable */ }
  };

  const clearLocalQuizState = () => {
    try { localStorage.removeItem(pendingKey); localStorage.removeItem(tabKey); } catch { /* ignore */ }
  };

  // Paginated mode: jump back to the top when the question changes
  useEffect(() => {
    if (step === "quiz" && isPaginated) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentIndex, step, isPaginated]);

  /* ----- Quiz-only guards: no right click / text selection, warn before leaving ----- */
  useEffect(() => {
    if (step !== "quiz") return;
    const block = (e) => e.preventDefault();
    const warnBeforeLeaving = (e) => {
      e.preventDefault();
      e.returnValue = "The timer is still running! Are you sure you want to leave?";
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("dragstart", block);
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("dragstart", block);
      window.removeEventListener("beforeunload", warnBeforeLeaving);
    };
  }, [step]);

  /* ----- Auto-save progress (debounced) ----- */
  useEffect(() => {
    if (step !== "quiz" || !code || !quizData) return;
    const saveTimer = setTimeout(async () => {
      if (!navigator.onLine) return;
      try {
        const formatted = quizData.questions.map((q) => ({ questionId: q._id, selectedAnswer: answers[q._id] || null }));
        await api.post("/quiz/session/save-progress", {
          code,
          studentName: studentInfo.name,
          studentSurname: studentInfo.surname,
          studentClass: studentInfo.className,
          answers: formatted,
        });
      } catch (err) {
        console.error("Failed to save progress", err);
      }
    }, 1000);
    return () => clearTimeout(saveTimer);
  }, [answers, studentInfo, step, code, quizData]);

  /* ----- Offline submission recovery ----- */
  const attemptSync = useCallback(async () => {
    if (syncingRef.current) return;
    const raw = localStorage.getItem(pendingKey);
    if (!raw || !quizData) return;

    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const saved = JSON.parse(raw);
      const formatted = quizData.questions.map((q) => ({ questionId: q._id, selectedAnswer: saved.answers?.[q._id] || null }));
      const res = await api.post("/quiz/submit", {
        code,
        studentName: saved.studentInfo.name,
        studentSurname: saved.studentInfo.surname,
        studentClass: saved.studentInfo.className,
        answers: formatted,
        tabSwitchCount: saved.tabSwitchCount || 0,
      });
      clearLocalQuizState();
      setStudentInfo(saved.studentInfo);
      setResult(res.data);
      setStep("result");
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        // Already received (e.g. the background send made it through) — nothing left to do
        clearLocalQuizState();
        setStep("already-submitted");
      } else if (status && status < 500) {
        // The server rejected it — retrying forever would never help
        clearLocalQuizState();
        setError(err.response?.data?.message || "We couldn't submit your quiz.");
        setStep("submit-failed");
      }
      // Network / 5xx: keep waiting, the retry loop will try again
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [code, quizData, pendingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      if (step === "offline-waiting") attemptSync();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [step, attemptSync]);

  useEffect(() => {
    if (step !== "offline-waiting") return;
    if (navigator.onLine) attemptSync();
    retryIntervalRef.current = setInterval(() => { if (navigator.onLine) attemptSync(); }, 5000);
    return () => clearInterval(retryIntervalRef.current);
  }, [step, attemptSync]);

  /* ----- Tab-switch tracking: counted on the device first, so going offline can't hide it ----- */
  useEffect(() => {
    if (step !== "quiz") return;

    const handleVisibilityChange = () => {
      if (!document.hidden || submittingRef.current) return;

      tabCountRef.current += 1;
      const count = tabCountRef.current;
      setTabSwitchCount(count);
      try { localStorage.setItem(tabKey, String(count)); } catch { /* ignore */ }

      // Tell the server too (best effort — it keeps its own count when online)
      postKeepalive("/quiz/session/update-tab", { code });

      if (maxTabSwitches && count >= maxTabSwitches && !autoSubmitRef.current) {
        autoSubmitRef.current = true;

        // 1) Keep the answers on this device in case the tab is closed or the data is off
        stashPending();

        // 2) Best-effort send that can still complete while the tab is closing
        const info = studentInfoRef.current;
        postKeepalive("/quiz/submit", {
          code,
          studentName: info.name,
          studentSurname: info.surname,
          studentClass: info.className,
          answers: (quizDataRef.current?.questions || []).map((q) => ({ questionId: q._id, selectedAnswer: answersRef.current[q._id] || null })),
          tabSwitchCount: count,
        });

        // 3) Normal submit flow (shows the result, or queues + retries if offline)
        setShowAutoSubmitModal(true);
        setTimeout(() => {
          setShowAutoSubmitModal(false);
          submitRef.current(true);
        }, 2000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [step, code, maxTabSwitches]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- Countdown (based on a fixed end time, so it survives throttled/background tabs) ----- */
  useEffect(() => {
    if (step !== "quiz" || !endTimeRef.current) return;
    let lastWarned = null;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if ((remaining === 300 || remaining === 60) && lastWarned !== remaining) {
        lastWarned = remaining;
        setTimeToast(remaining === 300 ? "5 minutes left" : "1 minute left");
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setTimeToast(""), 4000);
      }

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        submitRef.current(true);
      }
    }, 1000);
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(toastTimerRef.current);
    };
  }, [step]);

  /* ----- Handlers ----- */
  const handleValidateCode = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 3) return setError("Code is too short");
    setError("");
    setIsValidating(true);
    try {
      const res = await api.post("/quiz/validate-code", { code: trimmed });
      const data = res.data.data;

      if (data.gameMode === "gameShow") {
        navigate(`/game-show-lobby?code=${trimmed}`);
        return;
      }

      setQuizData(data);
      setMaxTabSwitches(data.maxTabSwitches);
      setTimeLeft(getTotalSeconds(data));

      // Answers saved on this device that never reached the server (page closed / data was off)
      const pending = localStorage.getItem(`${PENDING_PREFIX}${trimmed}`);
      if (pending) {
        try { setStudentInfo(JSON.parse(pending).studentInfo); } catch { /* ignore bad data */ }
        setStep("offline-waiting");
        return;
      }
      setStep("info");
    } catch (err) {
      const status = err.response?.status;
      // A leftover record for a code that's now used/invalid shouldn't keep nagging
      if (trimmed === recoveredCode && (status === 400 || status === 404)) {
        try { localStorage.removeItem(`${PENDING_PREFIX}${trimmed}`); } catch { /* ignore */ }
      }
      setError(err.response?.data?.message || "Invalid or already used code.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartQuiz = async (e) => {
    e.preventDefault();
    if (!studentInfo.name.trim() || !studentInfo.surname.trim()) return setError("Please enter your first name and surname.");
    setError("");
    setIsStarting(true);
    try {
      const res = await api.post("/quiz/session/start", { code });
      const data = res.data.data;

      setQuizData((prev) => ({ ...prev, ...data }));
      setMaxTabSwitches(data.maxTabSwitches);

      // Resume the higher of the server count and what this device recorded (e.g. while offline)
      let localCount = 0;
      try { localCount = Number(localStorage.getItem(tabKey)) || 0; } catch { /* ignore */ }
      tabCountRef.current = Math.max(data.tabSwitchCount || 0, localCount);
      setTabSwitchCount(tabCountRef.current);
      autoSubmitRef.current = false;

      if (data.savedStudentInfo) {
        setStudentInfo({
          name: data.savedStudentInfo.name || studentInfo.name,
          surname: data.savedStudentInfo.surname || studentInfo.surname,
          className: data.savedStudentInfo.className || "",
        });
      }
      const restored = {};
      (data.savedAnswers || []).forEach((a) => { if (a.selectedAnswer) restored[a.questionId] = a.selectedAnswer; });
      setAnswers(restored);

      const endTime = new Date(data.startTime).getTime() + getTotalSeconds(data) * 1000;
      endTimeRef.current = endTime;
      setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
      setCurrentIndex(0);
      submittingRef.current = false;
      setStep("quiz");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start quiz session.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelectAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setShowConfirm(false);
    setIsSubmitting(true);
    setError("");

    // Keep the answers safe on this device and let the retry loop send them
    const stashAndWait = () => {
      stashPending();
      clearInterval(timerRef.current);
      submittingRef.current = false;
      setIsSubmitting(false);
      setStep("offline-waiting");
    };

    if (!navigator.onLine) return stashAndWait();

    const formatted = quizData.questions.map((q) => ({ questionId: q._id, selectedAnswer: answersRef.current[q._id] || null }));
    try {
      const res = await api.post("/quiz/submit", {
        code,
        studentName: studentInfo.name,
        studentSurname: studentInfo.surname,
        studentClass: studentInfo.className,
        answers: formatted,
        tabSwitchCount: tabCountRef.current,
      });
      clearInterval(timerRef.current);
      clearLocalQuizState();
      setResult(res.data);
      setStep("result");
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        // The background send already went through
        clearInterval(timerRef.current);
        clearLocalQuizState();
        setStep("already-submitted");
        return;
      }
      // No response (network) or server trouble: don't lose the student's work — queue it and retry
      if (!err.response || status >= 500) return stashAndWait();
      submittingRef.current = false;
      setIsSubmitting(false);
      setError(err.response?.data?.message || "Failed to submit quiz.");
    }
  };
  submitRef.current = handleSubmitQuiz;

  const jumpToQuestion = (index) => {
    if (isPaginated) {
      setCurrentIndex(index);
    } else {
      document.getElementById(`question-${quizData.questions[index]._id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const reviewUnanswered = () => {
    const index = quizData.questions.findIndex((q) => !answers[q._id]);
    setShowConfirm(false);
    if (index >= 0) jumpToQuestion(index);
  };

  /* ----- Derived values ----- */
  const totalQuestions = quizData ? quizData.questions.length : 0;
  const answeredCount = quizData ? quizData.questions.filter((q) => answers[q._id]).length : 0;
  const progress = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;
  const percentage = result && result.totalQuestions > 0 ? Math.round((result.score / result.totalQuestions) * 100) : 0;
  const isPassing = percentage >= 50;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  /* ================= SCREENS ================= */

  if (step === "validate") {
    return (
      <div className={shell}>
        <div className={`${panel} text-center`}>
          <Stepper current={0} />
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft"><ListChecks className="h-8 w-8 text-brand" /></div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Join a quiz</h1>
          <p className="mb-6 text-muted-foreground">Enter the code your teacher gave you.</p>

          {recoveredCode && code === recoveredCode && (
            <p role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand-soft px-3 py-2 text-left text-sm text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>We found answers from your last quiz that haven't been sent yet. Tap Continue and we'll send them now.</span>
            </p>
          )}

          <form onSubmit={handleValidateCode} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase().slice(0, 10))}
              placeholder="e.g., T-8X92A1B3"
              aria-label="Quiz code"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              className="w-full rounded-2xl border-2 border-input bg-background p-4 text-center font-mono text-xl tracking-[0.15em] text-foreground placeholder:text-muted-foreground/50 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand-soft sm:text-2xl sm:tracking-[0.2em]"
            />
            <div className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < code.length ? "bg-brand" : "bg-border"}`} />
              ))}
            </div>
            <ErrorNote>{error}</ErrorNote>
            <button type="submit" disabled={code.length < 3 || isValidating} className={primaryBtn}>
              {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "info") {
    return (
      <div className={shell}>
        <div className={panel}>
          <Stepper current={1} />
          <div className="mb-5 flex items-start justify-between gap-3">
            <h1 className="min-w-0 break-words text-xl font-bold text-foreground sm:text-2xl">{quizData.title}</h1>
            <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium capitalize text-brand">{quizData.difficulty}</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-muted p-3">
              <ListChecks className="mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-bold text-foreground">{totalQuestions}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div className="rounded-2xl bg-muted p-3">
              <Clock className="mb-1 h-4 w-4 text-muted-foreground" />
              <p className="font-mono text-lg font-bold text-foreground">{formatTime(timeLeft)}</p>
              <p className="text-xs text-muted-foreground">Total time</p>
            </div>
          </div>

          <ul className="mb-5 space-y-2 rounded-2xl border border-border bg-background p-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> The timer starts when you tap Start and can't be paused.</li>
            {maxTabSwitches ? (
              <li className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> Leaving this page counts as a tab switch — even if your internet is off. After {maxTabSwitches}, your quiz is submitted automatically.</li>
            ) : null}
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Your answers save as you go.</li>
          </ul>

          <form onSubmit={handleStartQuiz} className="space-y-4">
            <div>
              <label htmlFor="first-name" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground"><User className="h-4 w-4 text-muted-foreground" /> First name</label>
              <input id="first-name" type="text" autoComplete="given-name" autoCapitalize="words" value={studentInfo.name} onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label htmlFor="surname" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground"><User className="h-4 w-4 text-muted-foreground" /> Surname</label>
              <input id="surname" type="text" autoComplete="family-name" autoCapitalize="words" value={studentInfo.surname} onChange={(e) => setStudentInfo({ ...studentInfo, surname: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label htmlFor="class-name" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground"><School className="h-4 w-4 text-muted-foreground" /> Class <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="class-name" type="text" value={studentInfo.className} onChange={(e) => setStudentInfo({ ...studentInfo, className: e.target.value })} className={inputCls} placeholder="e.g., Grade 10A" />
            </div>
            <ErrorNote>{error}</ErrorNote>
            <button type="submit" disabled={isStarting} className={primaryBtn}>
              {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start quiz <ArrowRight className="h-4 w-4" /></>}
            </button>
            <button type="button" onClick={() => { setError(""); setStep("validate"); }} className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Use a different code
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "offline-waiting") {
    return (
      <div className={shell}>
        <div className={`${panel} text-center`}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10"><WifiOff className="h-8 w-8 text-yellow-500" /></div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Waiting for connection…</h1>
          <p className="mb-6 text-muted-foreground">Your answers are safely stored on this device. We'll submit your quiz automatically as soon as you're back online. Please keep this page open.</p>
          {isSyncing ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
          ) : (
            <button type="button" onClick={attemptSync} className={primaryBtn}>Try submitting now</button>
          )}
        </div>
      </div>
    );
  }

  if (step === "already-submitted") {
    return (
      <div className={shell}>
        <div className={`${panel} text-center`}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10"><CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" /></div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Quiz submitted</h1>
          <p className="mb-6 text-muted-foreground">Your answers were received. Your teacher will share your results.</p>
          <button type="button" onClick={() => navigate("/")} className={primaryBtn}>Return to home</button>
        </div>
      </div>
    );
  }

  if (step === "submit-failed") {
    return (
      <div className={shell}>
        <div className={`${panel} text-center`}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10"><AlertTriangle className="h-8 w-8 text-destructive" /></div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">We couldn't submit your quiz</h1>
          <p className="mb-6 text-muted-foreground">{error || "Something went wrong."} Please tell your teacher.</p>
          <button type="button" onClick={() => navigate("/")} className={primaryBtn}>Return to home</button>
        </div>
      </div>
    );
  }

  if (step === "quiz") {
    const lowTime = timeLeft < 60;
    const nearTabLimit = maxTabSwitches && tabSwitchCount >= maxTabSwitches - 2;
    const currentQuestion = quizData.questions[currentIndex];
    const isLast = currentIndex === totalQuestions - 1;

    return (
      <div className={`min-h-dvh select-none bg-muted px-3 pt-3 sm:p-6 md:p-8 ${isPaginated ? "pb-28" : "pb-8"}`} style={{ userSelect: "none", WebkitUserSelect: "none" }}>
        {isOffline && (
          <div role="status" className="mx-auto mb-3 flex max-w-3xl items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm font-medium text-yellow-700 dark:text-yellow-400">
            <WifiOff className="h-4 w-4 shrink-0" /> <span>You're offline. Keep going — tab switches still count, and you can submit once you're back online.</span>
          </div>
        )}

        {timeToast && (
          <div role="status" className="fixed inset-x-4 top-20 z-30 mx-auto max-w-xs rounded-full bg-destructive px-4 py-2 text-center text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-2">
            ⏰ {timeToast}
          </div>
        )}

        {showAutoSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
              <h3 className="mb-2 text-xl font-bold text-foreground">Auto-submitting quiz</h3>
              <p className="mb-6 text-muted-foreground">You switched away from the quiz too many times.</p>
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" />
            </div>
          </div>
        )}

        {showConfirm && (
          <ConfirmSubmitModal
            answered={answeredCount}
            total={totalQuestions}
            busy={isSubmitting}
            onConfirm={handleSubmitQuiz}
            onCancel={() => setShowConfirm(false)}
            onReview={reviewUnanswered}
          />
        )}

        <div className="mx-auto max-w-3xl space-y-4">
          {/* Compact sticky bar: title, timer, progress */}
          <header className="sticky top-2 z-10 overflow-hidden rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-foreground sm:text-xl">{quizData.title}</h1>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                  {answeredCount}/{totalQuestions} answered<span className="hidden sm:inline"> · {studentInfo.name} {studentInfo.surname}</span>
                </p>
              </div>
              <div role="timer" className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-base font-bold sm:gap-2 sm:px-4 sm:py-2 sm:text-lg ${lowTime ? "bg-destructive/10 text-destructive motion-safe:animate-pulse" : "bg-brand-soft text-brand"}`}>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" /> {formatTime(timeLeft)}
              </div>
            </div>
            <div className="h-1.5 w-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={totalQuestions} aria-valuenow={answeredCount} aria-label="Questions answered">
              <div className="h-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </header>

          <QuestionChips questions={quizData.questions} answers={answers} currentIndex={isPaginated ? currentIndex : -1} onJump={jumpToQuestion} />

          {maxTabSwitches ? (
            <p className={`flex items-center gap-1.5 text-xs ${nearTabLimit ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
              <AlertTriangle className="h-3.5 w-3.5" /> Tab switches: {tabSwitchCount} / {maxTabSwitches}
            </p>
          ) : null}

          <ErrorNote>{error}</ErrorNote>

          {isPaginated ? (
            <QuestionCard
              key={currentQuestion._id}
              id={`question-${currentQuestion._id}`}
              question={currentQuestion}
              number={currentIndex + 1}
              selected={answers[currentQuestion._id]}
              onSelect={handleSelectAnswer}
            />
          ) : (
            <>
              {quizData.questions.map((q, idx) => (
                <QuestionCard key={q._id} id={`question-${q._id}`} question={q} number={idx + 1} selected={answers[q._id]} onSelect={handleSelectAnswer} />
              ))}
              <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-center shadow-sm sm:p-6">
                <p className="text-sm text-muted-foreground">
                  {answeredCount === totalQuestions
                    ? "You've answered every question. Ready when you are."
                    : `${totalQuestions - answeredCount} ${totalQuestions - answeredCount === 1 ? "question" : "questions"} still unanswered.`}
                </p>
                <button type="button" onClick={() => setShowConfirm(true)} disabled={isSubmitting || isSyncing} className={`${primaryBtn} text-lg`}>
                  {isSubmitting || isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit quiz"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Paginated mode: thumb-reach navigation pinned to the bottom (respects the iPhone home bar) */}
        {isPaginated && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <button type="button" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className={secondaryBtn} aria-label="Previous question">
                <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
              </button>
              <span className="flex-1 text-center text-sm font-medium text-muted-foreground">{currentIndex + 1} / {totalQuestions}</span>
              {isLast ? (
                <button type="button" onClick={() => setShowConfirm(true)} disabled={isSubmitting || isSyncing} className={primaryBtnInline}>
                  {isSubmitting || isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit"}
                </button>
              ) : (
                <button type="button" onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))} className={primaryBtnInline} aria-label="Next question">
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className={shell}>
        <div className={`${panel} text-center`}>
          <div className="relative mx-auto mb-5 h-40 w-40 sm:h-44 sm:w-44">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
              <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percentage / 100)} className={`transition-all duration-700 ${isPassing ? "stroke-green-500" : "stroke-destructive"}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black ${isPassing ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>{percentage}%</span>
              <span className="text-sm text-muted-foreground">{result.score} of {result.totalQuestions}</span>
            </div>
          </div>
          <h1 className="mb-1 flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
            {isPassing ? <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" /> : <XCircle className="h-6 w-6 text-destructive" />} Quiz submitted
          </h1>
          <p className="mb-6 text-muted-foreground">Great effort, {studentInfo.name}.</p>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-muted p-3">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.score}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="rounded-2xl bg-muted p-3">
              <p className="text-2xl font-bold text-foreground">{Math.max(0, result.totalQuestions - result.score)}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
          </div>
          {result.tabSwitchCount > 0 && (
            <p className="mb-6 flex items-center justify-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Tab switches detected: {result.tabSwitchCount}
            </p>
          )}
          <button type="button" onClick={() => navigate("/")} className={primaryBtn}>Return to home</button>
        </div>
      </div>
    );
  }

  return null;
}
