import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Trophy, ArrowLeft, RefreshCw } from "lucide-react";
import api from "../utils/api";

export default function GameShowBoard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");

  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [scores, setScores] = useState({}); // { "Student Name": points }
  const [newStudentName, setNewStudentName] = useState("");
  
  const timerRef = useRef(null);

  useEffect(() => {
    if (code) fetchQuizData();
  }, [code]);

  const fetchQuizData = async () => {
    try {
      const res = await api.post("/quiz/validate-code", { code });
      setQuiz(res.data.data);
      setTimeLeft(res.data.data.timeLimit * (res.data.data.timeUnit === "minutes" ? 60 : 1));
    } catch (err) {
      console.error("Failed to load game show", err);
    }
  };

  const startQuestion = (index) => {
    setCurrentIndex(index);
    setTimeLeft(quiz.timeLimit * (quiz.timeUnit === "minutes" ? 60 : 1));
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleScore = (action, studentName) => {
    if (!studentName) return alert("Please enter a student name first!");
    
    setScores((prev) => {
      const currentScore = prev[studentName] || 0;
      let pointsToAdd = 0;
      
      if (action === "correct") pointsToAdd = quiz.baseMarks;
      if (action === "steal") pointsToAdd = quiz.bonusMarks;
      
      return { ...prev, [studentName]: currentScore + pointsToAdd };
    });
    
    // Move to next question automatically after a brief pause
    setTimeout(() => {
      setCurrentIndex(null);
      stopTimer();
    }, 1500);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!quiz) return <div className="min-h-screen flex items-center justify-center bg-muted"><p>Loading Game Show...</p></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/admin/quizzes")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" /> Exit Game
        </button>
        <h1 className="text-2xl font-bold text-foreground">{quiz.title} <span className="text-brand">(Game Show Mode)</span></h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Base: {quiz.baseMarks} pts</p>
            <p className="text-xs text-muted-foreground">Steal: {quiz.bonusMarks} pts</p>
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="p-2 rounded-lg hover:bg-accent"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: Question Grid */}
        <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold mb-4 text-foreground">Question Board</h3>
          <div className="grid grid-cols-4 gap-3">
            {quiz.questions.map((q, idx) => (
              <button
                key={q._id}
                onClick={() => startQuestion(idx)}
                disabled={currentIndex !== null}
                className={`aspect-square rounded-xl font-bold text-lg transition-all ${
                  currentIndex === idx 
                    ? "bg-brand text-brand-foreground ring-4 ring-brand/30" 
                    : "bg-muted text-foreground hover:bg-brand/10 hover:text-brand"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Active Question & Timer */}
        <div className="lg:col-span-2 space-y-6">
          {currentIndex !== null ? (
            <div className="bg-card border-2 border-brand/30 rounded-2xl p-8 shadow-lg text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-center">
                <div className={`flex items-center gap-3 rounded-full px-6 py-3 font-mono text-3xl font-bold ${timeLeft <= 10 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-brand-soft text-brand"}`}>
                  <Clock className="w-8 h-8" /> {formatTime(timeLeft)}
                </div>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                {quiz.questions[currentIndex].question}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {quiz.questions[currentIndex].options.map((opt, i) => (
                  <div key={i} className="p-4 rounded-xl bg-muted text-lg font-medium text-foreground border border-border">
                    {String.fromCharCode(65 + i)}. {opt}
                  </div>
                ))}
              </div>

              {/* Teacher Controls */}
              <div className="pt-6 border-t border-border space-y-4">
                <input 
                  type="text" 
                  placeholder="Enter Student Name..." 
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full max-w-md mx-auto block rounded-xl border border-input bg-background px-4 py-3 text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <div className="flex justify-center gap-4">
                  <button onClick={() => handleScore("correct", newStudentName)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition">
                    <CheckCircle2 className="w-5 h-5" /> Correct (+{quiz.baseMarks})
                  </button>
                  <button onClick={() => { stopTimer(); setCurrentIndex(null); }} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive text-white font-bold hover:bg-destructive/90 transition">
                    <XCircle className="w-5 h-5" /> Wrong / Pass
                  </button>
                  <button onClick={() => handleScore("steal", newStudentName)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition">
                    <Trophy className="w-5 h-5" /> Steal Correct (+{quiz.bonusMarks})
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-2xl text-muted-foreground">
              <Trophy className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-xl font-medium">Select a question number to begin</p>
            </div>
          )}

          {/* Live Scoreboard */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Live Scoreboard
            </h3>
            {Object.keys(scores).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No points awarded yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(scores)
                  .sort(([,a], [,b]) => b - a)
                  .map(([name, score]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                      <span className="font-medium text-foreground truncate">{name}</span>
                      <span className="font-bold text-brand">{score} pts</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
