import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUserContext } from "../../context/userContext";
import { Swords, Clock, CheckCircle2, XCircle, Trophy, ArrowLeft, Loader2, UserCheck } from "lucide-react";
import api from "../../utils/api";
 
export default function BattleArena() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUserContext();
  
  const battleId = searchParams.get("battleId");
  const inviteCode = searchParams.get("invite");
  const isHost = searchParams.get("host") === "true";
 
  const [battleData, setBattleData] = useState(null);
  const [battleStatus, setBattleStatus] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
 
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [battleResolved, setBattleResolved] = useState(false);
  const [resultData, setResultData] = useState(null);
  
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  
  // Prevents infinite countdown loop
  const hasStartedCountdown = useRef(false);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
 
  useEffect(() => {
    const fetchBattle = async () => {
      try {
        const res = await api.post("/ai/battle/accept", { battleId, inviteCode });
        if (res.data.success) {
          setBattleData(res.data.data);
          setBattleStatus(res.data.data.status || "pending");
        } else {
          setError(res.data.message || "Battle not found.");
        }
      } catch (err) {
        setError("Failed to load battle. It may have expired or been completed.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchBattle();
  }, [battleId, inviteCode, isHost]);
 
  useEffect(() => {
    if (!isLoading && battleData && !showCountdown && !battleResolved) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/ai/battle/status?battleId=${battleData.battleId}`);
          if (res.data.success) {
            const newStatus = res.data.data.status;
            setBattleStatus(newStatus);
            
            if (newStatus === "active" && !hasStartedCountdown.current) {
              hasStartedCountdown.current = true;
              startCountdown();
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isLoading, battleData, showCountdown, battleResolved]);
 
  const startCountdown = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setShowCountdown(true);
    let count = 3;
    setCountdownNum(count);
    
    const countInterval = setInterval(() => {
      count -= 1;
      setCountdownNum(count);
      if (count === 0) {
        clearInterval(countInterval);
        setShowCountdown(false);
        setTimeLeft(15);
      }
    }, 1000);
  };
 
  const handleHostStart = async () => {
    try {
      await api.post("/ai/battle/start", { battleId: battleData.battleId });
    } catch (err) {
      alert("Failed to start battle");
    }
  };
 
  useEffect(() => {
    if (!showCountdown && !isAnswered && !battleResolved && timeLeft > 0 && battleData) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentQIndex, isAnswered, battleResolved, showCountdown, timeLeft, battleData]);
 
  const handleTimeUp = () => {
    clearInterval(timerRef.current);
    setIsAnswered(true);
    setTimeout(() => advanceQuestion(), 1500);
  };
 
  const handleOptionClick = (option) => {
    if (isAnswered) return;
    clearInterval(timerRef.current);
    setSelectedOption(option);
    setIsAnswered(true);
    const currentQ = battleData.questions[currentQIndex];
    if (option === currentQ.correctAnswer) setScore((prev) => prev + 1);
    setTimeout(() => advanceQuestion(), 1500);
  };
 
  const advanceQuestion = async () => {
    if (currentQIndex < battleData.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(15);
    } else {
      await resolveBattle();
    }
  };
 
  const resolveBattle = async () => {
    setBattleResolved(true);
    try {
      const res = await api.post("/ai/battle/resolve", { battleId: battleData.battleId, opponentScore: score });
      if (res.data.success) setResultData(res.data.data);
    } catch (err) {
      console.error("Failed to resolve battle:", err);
    }
  };
 
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
        <p className="text-lg font-medium text-foreground">Entering the Arena...</p>
      </div>
    );
  }
 
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <XCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Battle Unavailable</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <button onClick={() => navigate("/dashboard")} className="px-6 py-2 bg-brand text-brand-foreground rounded-lg font-medium hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors">Return to Dashboard</button>
      </div>
    );
  }
 
  if (battleResolved && resultData) {
    const isWin = resultData.won;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isWin ? "bg-yellow-500/20" : "bg-muted"}`}>
          <Trophy className={`w-10 h-10 ${isWin ? "text-yellow-500" : "text-muted-foreground"}`} />
        </div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">{isWin ? "🏆 Victory!" : "⚔️ Battle Complete!"}</h2>
        <p className="text-lg text-muted-foreground mb-6">You scored <span className="font-bold text-foreground">{score}</span> out of {battleData.questions.length}</p>
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm mb-8 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">XP Gained</span>
            <span className="text-xl font-bold text-brand">+{resultData.xpGained} XP</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">New Level</span>
            <span className="text-xl font-bold text-foreground">Level {resultData.newLevel}</span>
          </div>
        </div>
        <button onClick={() => navigate("/dashboard")} className="w-full max-w-sm py-3 rounded-xl bg-brand text-brand-foreground font-bold text-lg hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors flex items-center justify-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Return to Dashboard
        </button>
      </div>
    );
  }
 
  if (showCountdown) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background animate-in zoom-in-150 duration-300">
        <h1
          aria-live="polite"
          className="text-7xl sm:text-8xl md:text-9xl font-black text-brand animate-bounce"
        >
          {countdownNum > 0 ? countdownNum : "GO!"}
        </h1>
      </div>
    );
  }
 
  if (battleStatus === "pending" && isHost) {
    const shareLink = `${window.location.origin}/battle-arena?invite=${inviteCode}`;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-soft flex items-center justify-center mb-6">
          <Loader2 className="w-10 h-10 text-brand animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Waiting for Opponent...</h2>
        <p className="text-muted-foreground mb-6 max-w-md">Share this link with your friend. Once they click it, you can start the battle!</p>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border mb-6 w-full max-w-md">
          <input readOnly value={shareLink} className="flex-1 bg-transparent text-sm text-foreground focus:outline-none truncate" />
          <button onClick={() => navigator.clipboard.writeText(shareLink)} className="shrink-0 p-2 rounded-md hover:bg-muted text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">Copy</button>
        </div>
        <button onClick={() => navigate("/dashboard")} className="text-sm text-muted-foreground hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Cancel and return to Dashboard</button>
      </div>
    );
  }
 
  if ((battleStatus === "pending" || battleStatus === "joined") && !isHost) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Waiting for Host...</h2>
        <p className="text-muted-foreground max-w-md">The battle is set up! Waiting for {battleData.challengerName} to click "Start Battle".</p>
      </div>
    );
  }
 
  if (battleStatus === "joined" && isHost) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center animate-in fade-in">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <UserCheck className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Opponent Connected!</h2>
        <p className="text-muted-foreground mb-8 max-w-md">Your friend is in the arena and ready. Click below to begin!</p>
        <button onClick={handleHostStart} className="px-8 py-4 rounded-xl bg-brand text-brand-foreground font-bold text-lg hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all hover:scale-105 shadow-lg shadow-brand/20">
          ⚔️ START BATTLE
        </button>
      </div>
    );
  }
 
  const currentQ = battleData.questions[currentQIndex];
  const progress = ((currentQIndex) / battleData.questions.length) * 100;
 
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/dashboard")} aria-label="Back to dashboard" className="p-2 rounded-lg hover:bg-accent text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Battle Arena</h2>
          <p className="text-xs text-muted-foreground">{battleData.topic}</p>
        </div>
        <div className="w-10" />
      </div>
 
      <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex items-center justify-center gap-4 shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-2 text-brand font-bold">{battleData.challengerName.charAt(0)}</div>
          <p className="text-xs font-medium text-foreground truncate max-w-[80px]">{battleData.challengerName}</p>
        </div>
        <Swords className="w-6 h-6 text-muted-foreground shrink-0" />
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-electric-soft flex items-center justify-center mx-auto mb-2 text-electric font-bold">{user?.firstName?.charAt(0) || user?.fullName?.charAt(0) || "Y"}</div>
          <p className="text-xs font-medium text-foreground">You</p>
        </div>
      </div>
 
      <div className="mb-6 space-y-2">
        <div className="flex justify-between text-sm font-medium text-muted-foreground">
          <span>Question {currentQIndex + 1} of {battleData.questions.length}</span>
          <span className={`flex items-center gap-1 ${timeLeft <= 5 ? "text-destructive animate-pulse" : "text-foreground"}`}>
            <Clock className="w-4 h-4" /> {timeLeft}s
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
 
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
        <h3 className="text-lg md:text-xl font-display font-semibold text-foreground mb-6 leading-relaxed">{currentQ.question}</h3>
        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => {
            let btnClass = "border-border bg-background hover:bg-accent/50 hover:border-brand/30";
            if (isAnswered) {
              if (opt === currentQ.correctAnswer) btnClass = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
              else if (opt === selectedOption) btnClass = "border-destructive bg-destructive/10 text-destructive";
              else btnClass = "border-border bg-background opacity-50";
            }
            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(opt)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-xl border-2 text-left text-sm font-medium transition-all flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed ${btnClass}`}
              >
                <span>{opt}</span>
                {isAnswered && opt === currentQ.correctAnswer && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />}
                {isAnswered && opt === selectedOption && opt !== currentQ.correctAnswer && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
              </button>
            );
          })}
        </div>
        {isAnswered && (
          <div className={`mt-4 p-3 rounded-lg text-sm border ${selectedOption === currentQ.correctAnswer ? "bg-green-500/10 border-green-500/25 text-green-700 dark:text-green-400" : "bg-destructive/10 border-destructive/25 text-destructive"}`}>
            <span className="font-bold">{selectedOption === currentQ.correctAnswer ? "Correct! 🎉" : "Time's up or Wrong!"}</span> {currentQ.explanation}
          </div>
        )}
      </div>
    </div>
  );
}