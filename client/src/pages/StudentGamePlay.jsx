import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createKahootSocket } from "../utils/socket";
import { Trophy, AlertCircle, User, Check, X } from "lucide-react";

// ✅ Pre-load sounds
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
  const code = sessionStorage.getItem("kahoot_code");
  const [playerName, setPlayerName] = useState(sessionStorage.getItem("playerName") || "");
  const generatePlayerId = () => window.crypto?.randomUUID?.() || Math.random().toString(36).substring(2, 15);
  const [playerId, setPlayerId] = useState(sessionStorage.getItem("kahoot_playerId") || generatePlayerId());
  
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState("lobby"); 
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myStats, setMyStats] = useState({ score: 0, rank: 0, correctCount: 0 });
  const [lastResult, setLastResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // ✅ Unlock audio on first user interaction (browser requirement)
  const unlockAudio = () => {
    if (!audioUnlocked) {
      SOUNDS.correct.volume = 0.1;
      SOUNDS.correct.play().catch(() => {});
      setAudioUnlocked(true);
    }
  };

  useEffect(() => {
    if (!code) { navigate("/"); return; }
    if (!playerName) return; 

    sessionStorage.setItem("kahoot_playerId", playerId);
    const newSocket = createKahootSocket();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Student connected to /kahoot. Emitting player_join...");
      newSocket.emit("player_join", { code, name: playerName, playerId });
    });

    newSocket.on("joined", (snapshot) => {
      setGameState(snapshot.status);
      setMyStats({ score: snapshot.me.score, rank: snapshot.me.rank, correctCount: 0 });
      setLeaderboard(snapshot.leaderboard || []);
      if (snapshot.question) {
        setQuestion(snapshot.question);
        setTimeLeft(Math.ceil((snapshot.question.endsAt - Date.now()) / 1000));
      }
    });

    newSocket.on("question_start", (q) => {
      setGameState("playing");
      setQuestion(q);
      setTimeLeft(Math.ceil((q.endsAt - Date.now()) / 1000));
      setLastResult(null);
    });

    newSocket.on("answer_locked", () => {
      setGameState("answered");
    });

    newSocket.on("answer_result", (result) => {
      setGameState("reveal"); // ✅ New state for the massive animation
      setLastResult(result);
      setMyStats({ score: result.score, rank: result.rank, correctCount: result.correctCount });
      setLeaderboard(result.leaderboard || []);
      
      if (audioUnlocked) {
        if (result.correct) SOUNDS.correct.play().catch(() => {});
        else SOUNDS.incorrect.play().catch(() => {});
      }

      // ✅ Auto-advance to leaderboard after 3 seconds of showing the result
      setTimeout(() => {
        setGameState("leaderboard");
      }, 3000);
    });

    newSocket.on("game_finished", (data) => {
      setGameState("finished");
      setLeaderboard(data.leaderboard || []);
    });

    newSocket.on("game_error", (err) => {
      setError(err.message);
      setTimeout(() => navigate("/"), 3000);
    });

    return () => { newSocket.disconnect(); };
  }, [code, playerName, playerId, navigate, audioUnlocked]);

  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1 && audioUnlocked) SOUNDS.incorrect.play().catch(() => {}); 
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, timeLeft, audioUnlocked]);

  const handleAnswer = (choiceId) => {
    unlockAudio(); // ✅ Unlock audio when they click an answer
    if (gameState !== "playing" || !socket) return;
    socket.emit("player_answer", { choice: choiceId });
  };

  if (!playerName) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-brand" />
          <h2 className="text-2xl font-bold">Join Kahoot</h2>
          <p className="text-slate-400">Enter your nickname</p>
          <input 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 15))} 
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 p-4 text-center text-xl text-white placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="e.g. Alex"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') unlockAudio(); }}
          />
          <button 
            onClick={() => {
              if (playerName.trim()) {
                unlockAudio();
                sessionStorage.setItem("playerName", playerName.trim());
                setPlayerName(playerName.trim()); 
              }
            }}
            disabled={!playerName.trim()}
            className="w-full bg-brand text-white font-bold py-4 rounded-xl transition hover:bg-brand/90 disabled:opacity-50"
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Game Error</h2>
        <p className="text-slate-400 text-center">{error}</p>
        <button onClick={() => navigate("/")} className="mt-6 px-6 py-3 bg-brand text-white rounded-xl font-bold">Return Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header: Score & Rank */}
      <div className="bg-slate-900 p-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-bold text-lg">#{myStats.rank}</span>
        </div>
        <div className="text-center">
          <h1 className="font-black text-xl tracking-wider text-brand">{playerName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{myStats.score}</span>
          <Trophy className="h-5 w-5 text-brand" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        
        {/* 1. LOBBY STATE */}
        {gameState === "lobby" && (
          <div className="text-center space-y-4 animate-pulse">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand">
              <User className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-black">Waiting for host to start...</h2>
            <p className="text-slate-400">Get ready!</p>
          </div>
        )}

        {/* 2. PLAYING STATE (Shows Question + Shapes) */}
        {gameState === "playing" && question && (
          <div className="w-full max-w-3xl space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-1.5 text-red-400 font-bold text-xl mb-4">
                {timeLeft}s
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-white mb-8 px-4 leading-tight drop-shadow-lg">
                {question.question}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
              {question.options.map((opt, idx) => {
                const shape = SHAPES[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={`relative flex items-center gap-4 rounded-2xl p-4 md:p-6 text-left text-white font-bold text-lg md:text-xl shadow-xl transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-white/30 ${shape.color} ${shape.hover}`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/20 text-3xl font-black drop-shadow-md">
                      {shape.shape}
                    </span>
                    <span className="flex-1 break-words">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. ANSWERED STATE */}
        {gameState === "answered" && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand animate-bounce">
              <Trophy className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold">Answer locked in!</h2>
            <p className="text-slate-400">Waiting for the host to reveal the results...</p>
          </div>
        )}

        {/* 4. ✅ MASSIVE REVEAL ANIMATION (The Kahoot Vibe) */}
        {gameState === "reveal" && lastResult && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in zoom-in-95 duration-300 p-4">
            <div className={`text-6xl md:text-8xl font-black mb-4 flex items-center gap-4 ${lastResult.correct ? "text-green-500 animate-bounce" : "text-red-500 animate-pulse"}`}>
              {lastResult.correct ? <Check className="h-20 w-20" /> : <X className="h-20 w-20" />}
              {lastResult.correct ? "CORRECT!" : "WRONG!"}
            </div>
            
            {lastResult.points > 0 && (
              <div className="text-4xl md:text-5xl font-black text-yellow-400 mb-6 animate-in slide-in-from-bottom-4">
                +{lastResult.points} Points!
              </div>
            )}
            
            {!lastResult.correct && lastResult.correctAnswer && (
              <div className="text-xl md:text-2xl text-white/80 mb-8 text-center px-4 max-w-2xl animate-in fade-in duration-500 delay-150">
                The correct answer was: <span className="font-bold text-white block mt-2 text-3xl">{lastResult.correctAnswer}</span>
              </div>
            )}
            
            <p className="text-slate-400 animate-pulse mt-8">Showing leaderboard next...</p>
          </div>
        )}

        {/* 5. LEADERBOARD / FINISHED STATE */}
        {(gameState === "leaderboard" || gameState === "finished") && (
          <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <h2 className="text-3xl font-black text-center text-white">
              {gameState === "finished" ? "🏆 Final Standings 🏆" : "Live Leaderboard"}
            </h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6">
              <div className="space-y-3">
                {Array.isArray(leaderboard) && leaderboard.map((player, idx) => (
                  <div key={player.id || idx} className={`flex items-center justify-between rounded-xl p-4 transition-all ${player.name === playerName ? "bg-brand/20 border-2 border-brand scale-105 shadow-lg shadow-brand/20" : "bg-slate-800 border border-slate-700"}`}>
                    <div className="flex items-center gap-4">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full font-black text-lg ${idx === 0 ? "bg-yellow-500 text-black" : idx === 1 ? "bg-slate-400 text-black" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-700 text-slate-300"}`}>
                        {player.rank}
                      </span>
                      <span className="font-bold text-lg truncate max-w-[150px] md:max-w-xs">{player.name}</span>
                    </div>
                    <span className="font-black text-xl text-brand">{player.score} pts</span>
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