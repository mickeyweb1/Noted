import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Trophy, User, CheckCircle2, Loader2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { io } from "socket.io-client";
import api from "../utils/api";

// Initialize socket connection
const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
  withCredentials: true,
});

export default function GameShowLobby() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");

  const [step, setStep] = useState("enter-name"); // enter-name, waiting, playing, answered
  const [studentName, setStudentName] = useState("");
  const [quizData, setQuizData] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  
  const timerRef = useRef(null);

  // Disable right-click globally on this page
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Socket.io Listeners
  useEffect(() => {
    if (!code) return;

    socket.on("game_state", (state) => {
      setGameState(state);
      if (state.status === "live" && step === "waiting") {
        setStep("playing");
      }
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
        setTimeLeft(quizData.timeLimit);
        startTimer();
      }
    });

    socket.on("answer_result", ({ isCorrect, isSteal, scores, activityLog }) => {
      setActiveCard(null);
      setSelectedAnswer(null);
      setGameState((prev) => ({ ...prev, scores, activityLog }));
      setStep("playing");
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Show a brief success/fail message
      if (isCorrect) {
        alert(`Correct! +${isSteal ? quizData.bonusMarks : quizData.baseMarks} points!`);
      } else {
        alert("Incorrect! The card is now closed.");
      }
    });

    return () => {
      socket.off("game_state");
      socket.off("player_joined");
      socket.off("game_started");
      socket.off("card_locked");
      socket.off("answer_result");
    };
  }, [code, studentName, quizData, step]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAnswer(false, false); // Auto-submit wrong on timeout
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
      // Fetch quiz data first
      const res = await api.post("/quiz/validate-code", { code });
      setQuizData(res.data.data);
      
      // Join socket room
      socket.emit("join_game", { code, playerName: studentName });
      setStep("waiting");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code.");
    }
  };

  const handlePickCard = (index) => {
    if (activeCard) return; // Already locked
    socket.emit("pick_card", { code, cardIndex: index, playerName: studentName });
  };

  const handleAnswer = (isCorrect, isSteal = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    socket.emit("submit_answer", { code, cardIndex: activeCard.index, isCorrect, isSteal, playerName: studentName });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- RENDER: Enter Name ---
  if (step === "enter-name") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <Trophy className="h-8 w-8 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Join Live Match</h1>
            <p className="text-sm text-muted-foreground mt-2">Enter your name to join the game.</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your Name"
                className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-brand py-3 font-bold text-brand-foreground hover:bg-brand/90 transition">
              I'm Ready!
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER: Waiting for Admin ---
  if (step === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10">
            <Clock className="h-10 w-10 text-yellow-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">You're in, {studentName}!</h1>
            <p className="text-muted-foreground mt-2">Waiting for the admin to start the match...</p>
          </div>
          <div className="flex justify-center gap-2">
            <div className="h-3 w-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-3 w-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-3 w-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: Playing (Card Grid or Active Question) ---
  if (step === "playing" || step === "answered") {
    if (activeCard && activeCard.player === studentName) {
      const question = quizData.questions[activeCard.index];
      return (
        <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl bg-card border-2 border-brand/30 rounded-3xl p-8 shadow-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-center">
              <div className={`flex items-center gap-3 rounded-full px-6 py-3 font-mono text-3xl font-bold ${timeLeft <= 10 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-brand-soft text-brand"}`}>
                <Clock className="w-8 h-8" /> {formatTime(timeLeft)}
              </div>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{question.question}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {question.options.map((opt, i) => {
                const isSelected = selectedAnswer === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedAnswer(i)}
                    className={`p-4 rounded-xl text-lg font-medium border-2 transition-all ${
                      isSelected 
                        ? "border-brand bg-brand/10 text-brand" 
                        : "border-border bg-muted text-foreground hover:border-brand/50"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. {opt}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button 
                onClick={() => handleAnswer(false)} 
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive text-white font-bold hover:bg-destructive/90 transition"
              >
                <XCircle className="w-5 h-5" /> Skip / Wrong
              </button>
              <button 
                onClick={() => handleAnswer(selectedAnswer !== null && question.options[selectedAnswer] === question.correctAnswer)}
                disabled={selectedAnswer === null}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5" /> Submit Answer
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show Grid
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">{quizData?.title}</h1>
          <p className="text-muted-foreground mt-2">Pick an available card to answer!</p>
        </div>
        
        <div className="max-w-3xl mx-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {quizData?.questions.map((q, idx) => {
            const isLocked = activeCard && activeCard.index === idx;
            const isMyLock = isLocked && activeCard.player === studentName;
            const isOthersLock = isLocked && activeCard.player !== studentName;

            return (
              <button
                key={idx}
                onClick={() => handlePickCard(idx)}
                disabled={isLocked}
                className={`aspect-square rounded-2xl font-bold text-2xl transition-all duration-300 ${
                  isMyLock 
                    ? "bg-brand text-brand-foreground ring-4 ring-brand/30 scale-105" 
                    : isOthersLock 
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" 
                    : "bg-card border-2 border-border text-foreground hover:bg-brand/10 hover:border-brand hover:scale-105 shadow-sm"
                }`}
              >
                {isLocked ? (isMyLock ? "You" : "🔒") : idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
