import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Trophy, User, CheckCircle2, XCircle, Clock, Wifi, AlertTriangle, Award, Medal, ListChecks, Zap } from "lucide-react";
import { io } from "socket.io-client";
import api from "../utils/api";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const socketUrl = apiUrl.replace(/\/api$/, ""); 

const socket = io(socketUrl, { withCredentials: true });

function Confetti() {
  const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute w-3 h-3 rounded-full animate-bounce"
          style={{
            left: c.left,
            top: '-20px',
            backgroundColor: c.color,
            animation: `fall 3s ease-in ${c.delay} forwards`
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          to { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function GameShowLobby() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");

  const [step, setStep] = useState("enter-name");
  const [studentName, setStudentName] = useState("");
  const [quizData, setQuizData] = useState(null);
  const [quizId, setQuizId] = useState("");
  const [gameState, setGameState] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const timerRef = useRef(null);
  const activeCardRef = useRef(null);
  useEffect(() => { activeCardRef.current = activeCard; }, [activeCard]);

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  useEffect(() => {
    if (!code) return;

    socket.on("game_state", (state) => {
      setGameState(state);
      if (state.status === "live" && step === "waiting") setStep("playing");
    });

    socket.on("player_joined", ({ players, status }) => {
      setGameState((prev) => ({ ...prev, players, status }));
    });

    socket.on("game_started", (state) => {
      setGameState(state);
      setStep("playing");
    });

    socket.on("card_locked", ({ cardIndex, playerName }) => {
      setActiveCard({ index: cardIndex, player: playerName });
      if (playerName === studentName) {
        const totalTime = quizData.timeUnit === 'minutes' ? quizData.timeLimit * 60 : quizData.timeLimit;
        setTimeLeft(totalTime);
        startTimer();
      }
    });

    socket.on("answer_result", (data) => {
      setActiveCard(null);
      setSelectedAnswer(null);
      setGameState((prev) => ({ ...prev, scores: data.scores, completedCards: data.completedCards, cardResults: data.cardResults, activityLog: data.activityLog }));
      
      if (timerRef.current) clearInterval(timerRef.current);

      if (data.completedCards?.length === quizData?.questions.length) {
        setStep("game-over");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        return;
      }

      setStep("playing");
      
      if (data.isCorrect) {
        setFeedback({ type: 'success', message: `🎉 Correct! +${data.points} Points!` });
      } else if (data.isStealOpportunity) {
        if (data.stealPlayer === studentName) {
          setFeedback({ type: 'steal', message: `⚡ ${data.stealPlayer} missed! You can STEAL for +${quizData.bonusMarks || 5} pts!` });
          setActiveCard({ index: activeCard.index, player: studentName, isSteal: true });
          
          const baseTime = quizData.timeUnit === 'minutes' ? quizData.timeLimit * 60 : quizData.timeLimit;
          const stealTime = Math.ceil(baseTime / 2); 
          setTimeLeft(stealTime);
          startTimer();
          
        } else {
          setFeedback({ type: 'error', message: `Missed! ${data.stealPlayer} can now steal!` });
        }
      } else {
        setFeedback({ type: 'error', message: "❌ Incorrect! Card is now closed." });
      }

      setTimeout(() => setFeedback(null), 3000);
    });

    return () => {
      socket.off("game_state");
      socket.off("player_joined");
      socket.off("game_started");
      socket.off("card_locked");
      socket.off("answer_result");
    };
  }, [code, studentName, quizData, step, activeCard]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (activeCardRef.current && quizId) {
            socket.emit("submit_answer", { 
              quizId, 
              cardIndex: activeCardRef.current.index, 
              selectedAnswerIndex: -1, 
              playerName: studentName 
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!studentName.trim()) return setError("Please enter your name");
    setError("");

    try {
      const res = await api.post("/quiz/validate-code", { code });
      const data = res.data.data;
      setQuizData(data);
      setQuizId(data.quizId);
      socket.emit("join_game", { code, playerName: studentName, role: "student", quizId: data.quizId });
      setStep("waiting");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code.");
    }
  };

  const handlePickCard = (index) => {
    if (activeCard || gameState?.completedCards?.includes(index)) return;
    socket.emit("pick_card", { quizId, cardIndex: index, playerName: studentName });
  };

  const handleAnswer = (selectedIndex) => {
    if (timerRef.current) clearInterval(timerRef.current);
    socket.emit("submit_answer", { quizId, cardIndex: activeCard.index, selectedAnswerIndex: selectedIndex, playerName: studentName });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (step === "enter-name") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10"><Trophy className="h-8 w-8 text-brand" /></div>
          <div><h1 className="text-2xl font-bold text-foreground">Join Live Match</h1><p className="text-sm text-muted-foreground mt-2">Enter your name to join the game.</p></div>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Your Name (e.g., SS2)" className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-brand py-3 font-bold text-brand-foreground hover:bg-brand/90 transition">I'm Ready!</button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 relative">
            <Clock className="h-10 w-10 text-yellow-500 animate-pulse" />
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 border-2 border-card"><Wifi className="h-3 w-3 text-white" /></div>
          </div>
          <div><h1 className="text-2xl font-bold text-foreground">You're in, {studentName}!</h1><p className="text-muted-foreground mt-2">Waiting for the admin to start the match...</p></div>
          <div className="flex justify-center gap-2">
            <div className="h-3 w-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-3 w-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-3 w-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "game-over") {
    const sortedScores = Object.entries(gameState?.scores || {}).filter(([name]) => name !== "Admin").sort(([,a], [,b]) => b - a);
    const winner = sortedScores[0];
    const secondPlace = sortedScores[1];

    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        {showConfetti && <Confetti />}
        <div className="w-full max-w-3xl bg-card border-2 border-brand/30 rounded-3xl p-8 md:p-12 shadow-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="space-y-4">
            <Award className="w-20 h-20 text-brand mx-auto animate-bounce" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">🎉 Game Over!</h1>
            <p className="text-xl text-muted-foreground">The battle is complete!</p>
          </div>
          <div className="flex items-end justify-center gap-4 md:gap-8 mt-12">
            {secondPlace && (
              <div className="flex flex-col items-center">
                <Medal className="w-12 h-12 text-gray-400 mb-2" />
                <div className="w-24 md:w-32 h-24 md:h-32 rounded-2xl bg-gray-400/10 border-2 border-gray-400/30 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-foreground">{secondPlace[0]}</p>
                    <p className="text-lg text-brand font-bold">{secondPlace[1]} pts</p>
                  </div>
                </div>
                <div className="w-24 md:w-32 h-16 md:h-20 bg-gray-400/20 rounded-t-lg flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-500">2</span>
                </div>
              </div>
            )}
            {winner && (
              <div className="flex flex-col items-center -mt-8">
                <Trophy className="w-16 h-16 text-yellow-500 mb-2 animate-pulse" />
                <div className="w-32 md:w-40 h-32 md:h-40 rounded-2xl bg-yellow-500/10 border-4 border-yellow-500/30 flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/20">
                  <div className="text-center">
                    <p className="text-3xl md:text-4xl font-bold text-foreground">{winner[0]}</p>
                    <p className="text-2xl text-brand font-bold">{winner[1]} pts</p>
                  </div>
                </div>
                <div className="w-32 md:w-40 h-20 md:h-24 bg-yellow-500/20 rounded-t-lg flex items-center justify-center">
                  <span className="text-4xl font-bold text-yellow-600">1</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-8 border-t border-border">
            <p className="text-muted-foreground mb-2">Final Scores</p>
            <div className="flex justify-center gap-8 text-lg">
              {sortedScores.map(([name, score]) => (
                <div key={name} className="text-center">
                  <p className="font-bold text-foreground">{name}</p>
                  <p className="text-2xl font-bold text-brand">{score} pts</p>
                </div>
              ))}
            </div>
          </div>

          {/* ✅ NEW: Question Breakdown for Students */}
          <div className="pt-8 border-t border-border text-left">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 justify-center">
              <ListChecks className="w-5 h-5 text-brand" /> Question Breakdown
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {quizData?.questions.map((q, idx) => {
                const result = gameState?.cardResults?.find(r => r.cardIndex === idx);
                return (
                  <div key={idx} className="p-4 rounded-xl border border-border bg-muted/30">
                    <p className="font-medium text-foreground mb-2 text-sm">Q{idx + 1}. {q.question}</p>
                    {result ? (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                        result.result === 'correct' ? 'bg-green-500/10 text-green-600' :
                        result.result === 'steal' ? 'bg-purple-500/10 text-purple-600' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {result.result === 'correct' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {result.result === 'steal' && <Zap className="w-3.5 h-3.5" />}
                        {result.result === 'wrong' && <XCircle className="w-3.5 h-3.5" />}
                        {result.result === 'wrong' ? 'No one got it' : `${result.player} got it! (+${result.points} pts)`}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not played</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (step === "playing") {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
        {feedback && (
          <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300 ${
            feedback.type === 'success' ? 'bg-green-500 text-white border-green-400' : 
            feedback.type === 'steal' ? 'bg-purple-600 text-white border-purple-400 animate-pulse' : 
            'bg-destructive text-white border-destructive'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : feedback.type === 'steal' ? <AlertTriangle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            <span className="font-bold text-lg">{feedback.message}</span>
          </div>
        )}

        {activeCard && activeCard.player === studentName && quizData ? (
          <div className="w-full max-w-2xl bg-card border-2 border-brand/30 rounded-3xl p-8 shadow-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-300 mt-8">
            <div className="flex justify-center">
              <div className={`flex items-center gap-3 rounded-full px-6 py-3 font-mono text-3xl font-bold ${timeLeft <= 10 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-brand-soft text-brand"}`}>
                <Clock className="w-8 h-8" /> {formatTime(timeLeft)}
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{quizData.questions[activeCard.index].question}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizData.questions[activeCard.index].options.map((opt, i) => (
                <button key={i} onClick={() => setSelectedAnswer(i)} className={`p-4 rounded-xl text-lg font-medium border-2 transition-all ${selectedAnswer === i ? "border-brand bg-brand/10 text-brand" : "border-border bg-muted text-foreground hover:border-brand/50"}`}>
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-4 pt-4">
              <button onClick={() => handleAnswer(-1)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive text-white font-bold hover:bg-destructive/90 transition"><XCircle className="w-5 h-5" /> Skip</button>
              <button onClick={() => handleAnswer(selectedAnswer)} disabled={selectedAnswer === null} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"><CheckCircle2 className="w-5 h-5" /> Submit</button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground">{quizData?.title}</h1>
              <p className="text-muted-foreground mt-2">Pick an available card to answer!</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-12">
              {quizData?.questions.map((q, idx) => {
                const isCompleted = gameState?.completedCards?.includes(idx);
                const result = gameState?.cardResults?.find(r => r.cardIndex === idx);
                const isLocked = activeCard && activeCard.index === idx;
                const isMyLock = isLocked && activeCard.player === studentName;
                const isOthersLock = isLocked && activeCard.player !== studentName;

                return (
                  <button key={idx} onClick={() => handlePickCard(idx)} disabled={isLocked || isCompleted} className={`aspect-square rounded-2xl font-bold text-2xl transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                    isCompleted ? (result?.result === 'correct' || result?.result === 'steal' ? "bg-green-500/10 text-green-600 border-2 border-green-500/30" : "bg-destructive/10 text-destructive border-2 border-destructive/30") :
                    isMyLock ? "bg-brand text-brand-foreground ring-4 ring-brand/30 scale-105" : 
                    isOthersLock ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" : 
                    "bg-card border-2 border-border text-foreground hover:bg-brand/10 hover:border-brand hover:scale-105 shadow-sm"
                  }`}>
                    {isCompleted ? (result?.result === 'correct' || result?.result === 'steal' ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />) : 
                     isLocked ? (isMyLock ? "You" : <span className="text-sm font-medium">🔒 {activeCard.player}</span>) : idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm max-w-2xl mx-auto">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Trophy className="w-5 h-5 text-yellow-500" /> Live Scoreboard</h3>
              <div className="space-y-2">
                {Object.entries(gameState?.scores || {}).filter(([name]) => name !== "Admin").sort(([,a], [,b]) => b - a).map(([name, score], idx) => (
                  <div key={name} className={`flex items-center justify-between p-3 rounded-xl border ${name === studentName ? "bg-brand/5 border-brand/30" : "bg-muted border-border"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${idx === 0 ? "bg-yellow-500/20 text-yellow-600" : "bg-muted-foreground/20 text-muted-foreground"}`}>{idx + 1}</span>
                      <span className="font-semibold text-foreground">{name}</span>
                    </div>
                    <span className="font-bold text-brand text-lg">{score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
}
