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
  const code = sessionStorage.getItem("kahoot_code");
  const [playerName, setPlayerName] = useState(sessionStorage.getItem("playerName") || "");
// ✅ Safer UUID generation for the browser
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

  useEffect(() => {
    if (!code) { navigate("/"); return; }
    if (!playerName) return; // Wait for name input

    sessionStorage.setItem("kahoot_playerId", playerId);

    const newSocket = io(`${SOCKET_URL}/kahoot`, { transports: ["websocket"] });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("player_join", { code, name: playerName, playerId });
    });

    newSocket.on("joined", (snapshot) => {
      setGameState(snapshot.status);
      setMyStats({ score: snapshot.me.score, rank: snapshot.me.rank, correctCount: 0 });
      setLeaderboard(snapshot.leaderboard);
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
      setGameState("leaderboard");
      setLastResult(result);
      setMyStats({ score: result.score, rank: result.rank, correctCount: result.correctCount });
      setLeaderboard(result.leaderboard); // The engine sends the updated leaderboard here
      
      if (result.correct) SOUNDS.correct.play().catch(() => {});
      else SOUNDS.incorrect.play().catch(() => {});
    });

    newSocket.on("game_finished", (data) => {
      setGameState("finished");
      setLeaderboard(data.leaderboard);
    });

    newSocket.on("game_error", (err) => {
      setError(err.message);
      setTimeout(() => navigate("/"), 3000);
    });

    return () => { newSocket.disconnect(); };
  }, [code, playerName, playerId, navigate]);

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

  const handleAnswer = (choiceId) => {
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
          />
          <button 
            onClick={() => {
              if (playerName.trim()) {
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
        {gameState === "lobby" && (
          <div className="text-center space-y-4 animate-pulse">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand">
              <User className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-black">Waiting for host to start...</h2>
            <p className="text-slate-400">Get ready!</p>
          </div>
        )}

        {gameState === "playing" && question && (
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

        {(gameState === "leaderboard" || gameState === "finished") && lastResult && (
          <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-300">
            <div className={`rounded-2xl p-6 text-center shadow-lg ${lastResult.correct ? "bg-green-500/20 border-2 border-green-500" : "bg-red-500/20 border-2 border-red-500"}`}>
              <h2 className="text-3xl font-black mb-1">{lastResult.correct ? "Correct!" : "Incorrect"}</h2>
              {lastResult.points > 0 && <p className="text-xl font-bold text-yellow-400">+{lastResult.points} points!</p>}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-center font-bold text-slate-400 mb-3 uppercase tracking-wider text-sm">
                {gameState === "finished" ? "Final Standings" : "Top Players"}
              </h3>
              <div className="space-y-2">
                {leaderboard.map((player, idx) => (
                  <div key={player.id} className={`flex items-center justify-between rounded-xl p-3 ${player.name === playerName ? "bg-brand/20 border border-brand" : "bg-slate-800"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${idx === 0 ? "bg-yellow-500 text-black" : idx === 1 ? "bg-slate-400 text-black" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-700 text-slate-300"}`}>
                        {player.rank}
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