import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Loader2, User, School, ArrowRight, AlertTriangle } from "lucide-react";
import api from "../utils/api";

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
  
  // ✅ NEW: Anti-cheat & Server Timer State
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [maxTabSwitches, setMaxTabSwitches] = useState(null);
  const timerRef = useRef(null);

  // ✅ NEW: Tab Switch Detection
  useEffect(() => {
    if (step !== "quiz") return;
    
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        try {
          const res = await api.post("/quiz/session/update-tab", { code });
          setTabSwitchCount(res.data.tabSwitchCount);
          if (res.data.shouldAutoSubmit) {
            alert("You have switched tabs too many times. The quiz is being auto-submitted.");
            handleSubmitQuiz(true);
          }
        } catch (err) {
          console.error("Failed to update tab count", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [step, code]);

  // ✅ NEW: Server-Side Timer Logic
  useEffect(() => {
    if (step !== "quiz" || timeLeft <= 0) return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmitQuiz(true);
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
      // ✅ Start session on server to lock in the start time
      const res = await api.post("/quiz/session/start", { code });
      const data = res.data.data;
      setQuizData(data);
      setMaxTabSwitches(data.maxTabSwitches);
      
      // Calculate server-side time left
      const totalSeconds = data.timeType === "perQuestion" 
        ? data.timeLimit * data.questions.length 
        : data.timeLimit;
      const multiplier = data.timeUnit === "minutes" ? 60 : 1;
      const endTime = new Date(data.startTime).getTime() + (totalSeconds * multiplier * 1000);
      const initialTimeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      
      setTimeLeft(initialTimeLeft);
      setStep("info");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or already used code.");
    }
  };

  const handleStartQuiz = (e) => {
    e.preventDefault();
    if (!studentInfo.name || !studentInfo.surname) return setError("Please enter your name and surname.");
    setError("");
    setStep("quiz");
  };

  const handleSelectAnswer = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = async (isAuto = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    clearInterval(timerRef.current);
    
    const formattedAnswers = quizData.questions.map(q => ({
      questionId: q._id,
      selectedAnswer: answers[q._id] || null
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
      if (!isAuto) setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (step === "validate") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Join Quiz</h1>
          <p className="text-muted-foreground mb-6">Enter the 10-character code provided by your teacher.</p>
          <form onSubmit={handleValidateCode} className="space-y-4">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10))} placeholder="0000000000" className="w-full text-center text-2xl font-mono tracking-widest border border-border rounded-xl p-4 focus:ring-2 focus:ring-brand focus:outline-none" />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={code.length !== 10} className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold hover:bg-brand/90 disabled:opacity-50 transition">Continue</button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "info") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-foreground mb-1">{quizData.title}</h1>
          <p className="text-sm text-muted-foreground mb-6">Difficulty: {quizData.difficulty}</p>
          <form onSubmit={handleStartQuiz} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1"><User className="w-4 h-4" /> First Name</label>
              <input type="text" value={studentInfo.name} onChange={(e) => setStudentInfo({...studentInfo, name: e.target.value})} className="w-full border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1"><User className="w-4 h-4" /> Surname</label>
              <input type="text" value={studentInfo.surname} onChange={(e) => setStudentInfo({...studentInfo, surname: e.target.value})} className="w-full border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1"><School className="w-4 h-4" /> Class (Optional)</label>
              <input type="text" value={studentInfo.className} onChange={(e) => setStudentInfo({...studentInfo, className: e.target.value})} className="w-full border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" placeholder="e.g., Grade 10A" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold hover:bg-brand/90 transition flex items-center justify-center gap-2">Start Quiz <ArrowRight className="w-4 h-4" /></button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "quiz") {
    return (
      <div className="min-h-screen bg-muted p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-10 shadow-lg">
            <div>
              <h1 className="text-xl font-bold text-foreground">{quizData.title}</h1>
              <p className="text-sm text-muted-foreground">{studentInfo.name} {studentInfo.surname}</p>
              {maxTabSwitches && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${tabSwitchCount >= maxTabSwitches - 2 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                  <AlertTriangle className="w-3 h-3" /> Tab switches: {tabSwitchCount} / {maxTabSwitches}
                </p>
              )}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold ${timeLeft < 60 ? 'bg-red-500/10 text-red-600 animate-pulse' : 'bg-brand/10 text-brand'}`}>
              <Clock className="w-5 h-5" /> {formatTime(timeLeft)}
            </div>
          </div>

          <div className="space-y-6">
            {quizData.questions.map((q, idx) => (
              <div key={q._id} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                {q.imageUrl && <img src={q.imageUrl} alt="Question visual" className="w-full max-h-64 object-contain rounded-lg mb-4 border border-border" />}
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  <span className="text-brand mr-2">{idx + 1}.</span> {q.question}
                </h3>
                <div className="space-y-3">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = answers[q._id] === opt;
                    return (
                      <button key={optIdx} onClick={() => handleSelectAnswer(q._id, opt)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-brand bg-brand/5 text-foreground' : 'border-border bg-background hover:border-brand/30'}`}>
                        <span className="font-bold mr-3 text-muted-foreground">{String.fromCharCode(65 + optIdx)}.</span>{opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center pb-8">
            <button onClick={() => handleSubmitQuiz(false)} disabled={isSubmitting} className="px-8 py-4 bg-brand text-brand-foreground rounded-xl font-bold text-lg hover:bg-brand/90 transition shadow-lg flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Quiz"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "result") {
    const percentage = Math.round((result.score / result.totalQuestions) * 100);
    const isPassing = percentage >= 50;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-lg text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${isPassing ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {isPassing ? <CheckCircle2 className="w-12 h-12 text-green-600" /> : <XCircle className="w-12 h-12 text-red-600" />}
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Quiz Submitted!</h1>
          <p className="text-muted-foreground mb-6">Great effort, {studentInfo.name}.</p>
          
          <div className="bg-muted rounded-xl p-6 mb-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Your Score</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className={`text-5xl font-black ${isPassing ? 'text-green-600' : 'text-red-600'}`}>{percentage}%</span>
              <span className="text-xl text-muted-foreground">({result.score}/{result.totalQuestions})</span>
            </div>
            {result.tabSwitchCount > 0 && (
              <p className="text-xs text-red-500 mt-3 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Tab switches detected: {result.tabSwitchCount}
              </p>
            )}
          </div>

          <button onClick={() => navigate("/")} className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold hover:bg-brand/90 transition">Return to Home</button>
        </div>
      </div>
    );
  }
}