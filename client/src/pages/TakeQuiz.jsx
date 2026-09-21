import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Loader2, User, School, ArrowRight } from "lucide-react";
import api from "../utils/api";

export default function TakeQuiz() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Steps: 'validate' | 'info' | 'quiz' | 'result'
  const [step, setStep] = useState("validate");
  const [code, setCode] = useState(location.state?.code || "");
  
  const [quizData, setQuizData] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ name: "", surname: "", className: "" });
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Timer Logic
  useEffect(() => {
    if (step !== "quiz" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleValidateCode = async (e) => {
    e.preventDefault();
    if (code.length !== 10) return setError("Code must be 10 digits");
    setError("");
    
    try {
      const res = await api.post("/quiz/validate-code", { code });
      setQuizData(res.data.data);
      
      // Set initial time
      const totalSeconds = res.data.data.timeType === "perQuestion" 
        ? res.data.data.timeLimit * 60 
        : res.data.data.timeLimit * 60 * res.data.data.questions.length;
      setTimeLeft(totalSeconds);
      
      setStep("info");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or already used code.");
    }
  };

  const handleStartQuiz = (e) => {
    e.preventDefault();
    if (!studentInfo.name || !studentInfo.surname) {
      return setError("Please enter your name and surname.");
    }
    setError("");
    setStep("quiz");
  };

  const handleSelectAnswer = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
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
        answers: formattedAnswers,
        timeTaken: quizData.timeLimit * 60 * quizData.questions.length - timeLeft
      });
      setResult(res.data);
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- RENDER STEPS ---

  if (step === "validate") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Join Quiz</h1>
          <p className="text-muted-foreground mb-6">Enter the 10-digit code provided by your teacher.</p>
          
          <form onSubmit={handleValidateCode} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="0000000000"
              className="w-full text-center text-2xl font-mono tracking-widest border border-border rounded-xl p-4 focus:ring-2 focus:ring-brand focus:outline-none"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={code.length !== 10} className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold hover:bg-brand/90 disabled:opacity-50 transition">
              Continue
            </button>
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
            <button type="submit" className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold hover:bg-brand/90 transition flex items-center justify-center gap-2">
              Start Quiz <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "quiz") {
    return (
      <div className="min-h-screen bg-muted p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-10 shadow-lg">
            <div>
              <h1 className="text-xl font-bold text-foreground">{quizData.title}</h1>
              <p className="text-sm text-muted-foreground">{studentInfo.name} {studentInfo.surname}</p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold ${timeLeft < 60 ? 'bg-red-500/10 text-red-600 animate-pulse' : 'bg-brand/10 text-brand'}`}>
              <Clock className="w-5 h-5" /> {formatTime(timeLeft)}
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {quizData.questions.map((q, idx) => (
              <div key={q._id} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  <span className="text-brand mr-2">{idx + 1}.</span> {q.question}
                </h3>
                <div className="space-y-3">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = answers[q._id] === opt;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectAnswer(q._id, opt)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? 'border-brand bg-brand/5 text-foreground' 
                            : 'border-border bg-background hover:border-brand/30'
                        }`}
                      >
                        <span className="font-bold mr-3 text-muted-foreground">{String.fromCharCode(65 + optIdx)}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pb-8">
            <button 
              onClick={handleSubmitQuiz} 
              disabled={isSubmitting}
              className="px-8 py-4 bg-brand text-brand-foreground rounded-xl font-bold text-lg hover:bg-brand/90 transition shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Quiz"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-lg text-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Quiz Submitted!</h1>
          <p className="text-muted-foreground mb-6">Great job, {studentInfo.name}.</p>
          
          <div className="bg-muted rounded-xl p-6 mb-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Your Score</p>
            <p className="text-4xl font-bold text-brand">{result.score} / {result.totalQuestions}</p>
            <p className="text-sm text-muted-foreground mt-2">Your teacher will be able to see this result.</p>
          </div>

          <button onClick={() => navigate("/")} className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold hover:bg-brand/90 transition">
            Return to Home
          </button>
        </div>
      </div>
    );
  }
}