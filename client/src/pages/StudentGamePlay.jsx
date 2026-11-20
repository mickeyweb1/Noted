import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Trophy, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Simple sound effects (using reliable public CDN links for demo purposes)
const SOUNDS = {
  tick: new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"),
  correct: new Audio("https://actions.google.com/sounds/v1/cartoon/clown_horn.ogg"), // Replace with a nice "ding"
  incorrect: new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg"), // Replace with a "buzz"
};

const KAHOOT_COLORS = [
  { bg: "bg-red-500", hover: "hover:bg-red-600", shape: "▲", label: "Red Triangle" },
  { bg: "bg-blue-500", hover: "hover:bg-blue-600", shape: "◆", label: "Blue Diamond" },
  { bg: "bg-yellow-500", hover: "hover:bg-yellow-600", shape: "●", label: "Yellow Circle" },
  { bg: "bg-green-500", hover: "hover:bg-green-600", shape: "■", label: "Green Square" },
];

export default function StudentGamePlay() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  
  // Game State: 'waiting', 'playing', 'answered', 'leaderboard'
  const [gameState, setGameState] = useState("waiting");
  const [quizId, setQuizId] = useState("");
  const [playerName, setPlayerName] = useState("");
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);
  const [lastResult, setLastResult] = useState(null); // { isCorrect, points, message }
  const [leaderboard, setLeaderboard] = useState([]);

  // Load session data
  useEffect(() => {
    const storedQuizId = sessionStorage.getItem("quizId");
    const storedName = sessionStorage.getItem("playerName");
    
    if (!storedQuizId || !storedName) {
      navigate("/game-join");
      return;
    }
    
    setQuizId(storedQuizId);
    setPlayerName(storedName);

    // Connect to Socket
    const newSocket = io(SOCKET_URL, { transports: ["websocket"] });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join_game", {
        quizId: storedQuizId,
        playerName: storedName,
        role: "student",
      });
    });

    // --- SOCKET EVENT LISTENERS ---
    newSocket.on("game_started", () => {
      setGameState("playing");
    });

    newSocket.on("card_locked", ({ cardIndex, remainingMs }) => {
      setCurrentQuestionIndex(cardIndex);
      setTimeLeft(Math.ceil(remainingMs / 1000));
      setGameState("playing");
      setLastResult(null);
    });

    newSocket.on("answer_result", ({ isCorrect, points, isTimeout, scores, activityLog }) => {
      setGameState("leaderboard");
      setLastResult({ 
        isCorrect, 
        points: points || 0, 
        message: isTimeout ? "Time's up!" : isCorrect ? "Correct!" : "Incorrect" 
      });
      
      if (isCorrect && points > 0) {
        setMyScore((prev) => prev + points);
        SOUNDS.correct.play().catch(() => {});
      } else {
        SOUNDS.incorrect.play().catch(() => {});
      }

      // Calculate rank and build leaderboard from scores object
      const sortedPlayers = Object.entries(scores || {})
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score);
      
      setLeaderboard(sortedPlayers.slice(0, 5)); // Top 5
      
      const myRankIndex = sortedPlayers.findIndex(p => p.name === playerName);
      setMyRank(myRankIndex >= 0 ? myRankIndex + 1 : sortedPlayers.length + 1);
    });

    newSocket.on("error", (msg) => {
      alert(msg);
      navigate("/game-join");
    });

    return () => {
      newSocket.disconnect();
    };
  }, [navigate, playerName]);

  // Timer countdown effect
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            SOUNDS.tick.play().catch(() => {});
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, timeLeft]);

  const handleAnswer = (optionIndex) => {
    if (gameState !== "playing") return;
    
    setGameState("answered"); // Prevent double clicks
    socket.emit("submit_answer", {
      quizId,
      cardIndex: currentQuestionIndex,
      selectedAnswerIndex: optionIndex,
    });
  };

  if (!socket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header: Score & Rank */}
      <div className="bg-slate-900 p-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-bold text-lg">#{myRank}</span>
        </div>
        <div className="text-center">
          <h1 className="font-black text-xl tracking-wider text-brand">{playerName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{myScore}</span>
          <Trophy className="h-5 w-5 text-brand" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        
        {gameState === "waiting" && (
          <div className="text-center space-y-4 animate-pulse">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Clock className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-black">Waiting for host to start...</h2>
            <p className="text-slate-400">Get ready!</p>
          </div>
        )}

        {gameState === "playing" && (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-1.5 text-red-400 font-bold text-xl">
                <Clock className="h-5 w-5" /> {timeLeft}s
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {KAHOOT_COLORS.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className={`aspect-square rounded-2xl ${color.bg} ${color.hover} flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-white/30`}
                  aria-label={color.label}
                >
                  <span className="text-6xl font-black text-white drop-shadow-md">{color.shape}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500">Tap the shape that matches your teacher's screen!</p>
          </div>
        )}

        {gameState === "answered" && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand animate-bounce">
              <Clock className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold">Answer locked in!</h2>
            <p className="text-slate-400">Waiting for the host to reveal the results...</p>
          </div>
        )}

        {gameState === "leaderboard" && lastResult && (
          <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Result Banner */}
            <div className={`rounded-2xl p-6 text-center shadow-lg ${
              lastResult.isCorrect ? "bg-green-500/20 border-2 border-green-500" : "bg-red-500/20 border-2 border-red-500"
            }`}>
              {lastResult.isCorrect ? (
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-2" />
              ) : (
                <XCircle className="mx-auto h-16 w-16 text-red-500 mb-2" />
              )}
              <h2 className="text-3xl font-black mb-1">{lastResult.message}</h2>
              {lastResult.points > 0 && (
                <p className="text-xl font-bold text-yellow-400">+{lastResult.points} points!</p>
              )}
            </div>

            {/* Mini Leaderboard */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-center font-bold text-slate-400 mb-3 uppercase tracking-wider text-sm">Top Players</h3>
              <div className="space-y-2">
                {leaderboard.map((player, idx) => (
                  <div 
                    key={player.name} 
                    className={`flex items-center justify-between rounded-xl p-3 ${
                      player.name === playerName ? "bg-brand/20 border border-brand" : "bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                        idx === 0 ? "bg-yellow-500 text-black" :
                        idx === 1 ? "bg-slate-400 text-black" :
                        idx === 2 ? "bg-amber-700 text-white" : "bg-slate-700 text-slate-300"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold truncate max-w-[120px]">{player.name}</span>
                    </div>
                    <span className="font-bold text-brand">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}