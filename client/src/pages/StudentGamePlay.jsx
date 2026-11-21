import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Trophy, AlertCircle, User } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SOUNDS = {
  correct: new Audio("https://actions.google.com/sounds/v1/cartoon/clown_horn.ogg"), 
  incorrect: new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg"), 
};

const SHAPES = [
  { id: 0, color: "bg-red-500", hover: "hover:bg-red-600", shape: "▲", name: "Red Triangle" },
  { id: 1, color: "bg-blue-500", hover: "hover:bg-blue-600", shape: "◆", name: "Blue Diamond" },
  { id: 2, color: "bg-yellow-500", hover: "hover:bg-yellow-600", shape: "●", name: "Yellow Circle" },
  { id: 3, color: "bg-green-500", hover: "hover:bg-green-600", shape: "■", name: "Green Square" },
];

export default function StudentGamePlay() {
  const navigate = useNavigate();
  
  // ✅ Read from sessionStorage (set by TakeQuiz.jsx)
  const quizId = sessionStorage.getItem("kahoot_quizId");
  const code = sessionStorage.getItem("kahoot_code");
  const title = sessionStorage.getItem("kahoot_title");
  
  const [playerName, setPlayerName] = useState(sessionStorage.getItem("playerName") || "");
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState("lobby"); 
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");

  // If no quizId or code, they shouldn't be here
  useEffect(() => {
    if (!quizId || !code) {
      navigate("/");
    }
  }, [quizId, code, navigate]);

  // Socket Connection
  useEffect(() => {
    if (!quizId || !playerName || !code) return;

    const newSocket = io(SOCKET_URL, { transports: ["websocket"] });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      // ✅ FIX: We MUST send the 'code' so the backend knows which game to join
      newSocket.emit("join_game", {
        code: code,          // ✅ ADDED THIS
        quizId: quizId,
        playerName: playerName,
        role: "student",
      });
    });

    newSocket.on("game_started", () => {
      setGameState("playing");
    });

    newSocket.on("card_locked", ({ cardIndex, remainingMs }) => {
      setCurrentQuestion({ index: cardIndex }); 
      setTimeLeft(Math.ceil(remainingMs / 1000));
      setGameState("playing");
      setLastResult(null);
    });

    newSocket.on("answer_result", ({ isCorrect, points, isTimeout, scores }) => {
      setGameState("leaderboard");
      setLastResult({ isCorrect, points: points || 0, message: isTimeout ? "Time's up!" : isCorrect ? "Correct!" : "Incorrect" });
      
      if (isCorrect && points > 0) {
        setMyScore((prev) => prev + points);
        SOUNDS.correct.play().catch(() => {});
      } else {
        SOUNDS.incorrect.play().catch(() => {});
      }

      const sortedPlayers = Object.entries(scores || {})
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score);
      
      setLeaderboard(sortedPlayers.slice(0, 5));
      const myRankIndex = sortedPlayers.findIndex(p => p.name === playerName);
      setMyRank(myRankIndex >= 0 ? myRankIndex + 1 : sortedPlayers.length + 1);
    });

    newSocket.on("error", (msg) => {
      console.error("Kahoot Socket Error:", msg); // ✅ Added console log so we can see if it fails
      setError(msg);
      setTimeout(() => navigate("/"), 3000);
    });

    return () => { 
      newSocket.disconnect(); 
    };
  }, [quizId, playerName, code, navigate]);

  // Timer countdown
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) SOUNDS.incorrect.play().catch(() => {}); 
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, timeLeft]);

  const handleAnswer = (shapeId) => {
    if (gameState !== "playing" || !currentQuestion) return;
    setGameState("answered");
    socket.emit("submit_answer", { quizId, cardIndex: currentQuestion.index, selectedAnswerIndex: shapeId });
  };

  // ✅ NAME INPUT SCREEN (If they haven't entered a name yet)
  if (!playerName) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-brand" />
          <h2 className="text-2xl font-bold">{title || "Kahoot Game"}</h2>
          <p className="text-slate-400">Enter your nickname to join</p>
          
          <input 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 15))} 
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 p-4 text-center text-xl text-white placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="e.g. Alex"
            autoFocus
          />
          
          <button 
            onClick={() => {
              if (playerName.trim()) {
                sessionStorage.setItem("playerName", playerName.trim());
                setPlayerName(playerName.trim()); 
              }
            }}
            disabled={!playerName.trim()}
            className="w-full bg-brand text-white font-bold py-4 rounded-xl transition hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  // ✅ ERROR SCREEN
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Game Error</h2>
        <p className="text-slate-400">{error}</p>
        <button onClick={() => navigate("/")} className="mt-6 px-6 py-3 bg-brand text-white rounded-xl font-bold">Return Home</button>
      </div>
    );
  }

  // ✅ MAIN GAMEPLAY SCREEN
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
        
        {gameState === "lobby" && (
          <div className="text-center space-y-4 animate-pulse">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand">
              <User className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-black">Waiting for host to start...</h2>
            <p className="text-slate-400">Get ready!</p>
          </div>
        )}

        {gameState === "playing" && (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-1.5 text-red-400 font-bold text-xl">
                {timeLeft}s
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => handleAnswer(shape.id)}
                  className={`aspect-square rounded-2xl ${shape.color} ${shape.hover} flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-white/30`}
                  aria-label={shape.name}
                >
                  <span className="text-7xl font-black text-white drop-shadow-md">{shape.shape}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500">Tap the shape that matches your teacher's screen!</p>
          </div>
        )}

        {gameState === "answered" && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand animate-bounce">
              <Trophy className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold">Answer locked in!</h2>
            <p className="text-slate-400">Waiting for the host to reveal the results...</p>
          </div>
        )}

        {gameState === "leaderboard" && lastResult && (
          <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-300">
            <div className={`rounded-2xl p-6 text-center shadow-lg ${
              lastResult.isCorrect ? "bg-green-500/20 border-2 border-green-500" : "bg-red-500/20 border-2 border-red-500"
            }`}>
              <h2 className="text-3xl font-black mb-1">{lastResult.message}</h2>
              {lastResult.points > 0 && <p className="text-xl font-bold text-yellow-400">+{lastResult.points} points!</p>}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-center font-bold text-slate-400 mb-3 uppercase tracking-wider text-sm">Top Players</h3>
              <div className="space-y-2">
                {leaderboard.map((player, idx) => (
                  <div key={player.name} className={`flex items-center justify-between rounded-xl p-3 ${player.name === playerName ? "bg-brand/20 border border-brand" : "bg-slate-800"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                        idx === 0 ? "bg-yellow-500 text-black" : idx === 1 ? "bg-slate-400 text-black" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-700 text-slate-300"
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