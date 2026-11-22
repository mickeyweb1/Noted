import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createKahootSocket } from "../utils/socket";
import { Users, Play, AlertCircle, Monitor, Loader2, SkipForward } from "lucide-react";

export default function TeacherGameHost() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
    console.log("🔌 Attempting to connect to /kahoot namespace. quizId:", quizId);
    
    // ✅ USE THE NEW HELPER HERE
    const newSocket = createKahootSocket(); 
    setSocket(newSocket);

    const token = localStorage.getItem("token");
    console.log("🔑 Token found:", token ? "Yes" : "No");

    newSocket.on("connect", () => {
      console.log("✅ Successfully connected to /kahoot namespace! Emitting host_join...");
      newSocket.emit("host_join", { quizId, token });
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
      setError("Failed to connect to game server. Is the backend running?");
      setIsLoading(false);
    });

    newSocket.on("host_state", (state) => {
      console.log("🎮 Received host_state from backend:", state);
      setGameState(state);
      setIsLoading(false);
    });

    newSocket.on("game_error", (err) => {
      console.error("🚨 Received game_error from backend:", err);
      setError(err.message);
      setIsLoading(false);
    });

    return () => { 
      console.log("🔌 Component unmounting, disconnecting socket...");
      newSocket.disconnect(); 
    };
  }, [quizId]);

  const handleStart = () => {
    if (socket && gameState?.quizId) {
      console.log("▶️ Emitting host_start...");
      socket.emit("host_start", { quizId: gameState.quizId });
    }
  };

  const handleNext = () => {
    if (socket && gameState?.quizId) {
      console.log("⏭️ Emitting host_next...");
      socket.emit("host_next", { quizId: gameState.quizId });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-brand mb-4" />
        <p className="text-slate-400">Connecting to game server...</p>
        <p className="text-xs text-slate-600 mt-2">Check browser console (F12) for details</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-xl font-bold">Connection Error</h2>
          <p className="mt-2 text-slate-400">{error}</p>
          <button onClick={() => navigate("/admin/kahoot")} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white">Go Back</button>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <Monitor className="mx-auto h-12 w-12 text-brand" />
          <h1 className="text-4xl font-bold">{gameState.title}</h1>
          <p className="text-slate-400">Join at <span className="font-bold text-white">usenotedai.com/game-join</span></p>
        </div>

        <div className="rounded-3xl border-4 border-brand bg-brand/10 p-10 text-center shadow-2xl shadow-brand/20">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand mb-4">Enter this code to join</p>
          <h2 className="text-7xl md:text-8xl font-black tracking-widest text-white">{gameState.code || "LOADING"}</h2>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <Users className="h-5 w-5 text-brand" /> Players Joined ({gameState.players.length})
            </h3>
            
            {gameState.status === "lobby" && gameState.players.length > 0 && (
              gameState.autoStart ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-yellow-500/20 px-6 py-3 font-bold text-yellow-400 animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin" /> Starting automatically...
                </span>
              ) : (
                <button onClick={handleStart} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-green-500 active:scale-95">
                  <Play className="h-5 w-5 fill-current" /> Start Game
                </button>
              )
            )}

            {gameState.status === "reveal" && (
              <button onClick={handleNext} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg transition hover:bg-brand/90 active:scale-95">
                <SkipForward className="h-5 w-5" /> Next Question
              </button>
            )}

            {gameState.status === "finished" && (
              <span className="rounded-full bg-green-500/20 px-4 py-1.5 text-sm font-bold text-green-400 animate-pulse">
                ● Game Finished
              </span>
            )}
          </div>

          {gameState.players.length === 0 ? (
            <div className="py-12 text-center text-slate-500"><p>Waiting for students to join...</p></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {gameState.players.map((player) => (
                <div key={player.id} className="rounded-xl bg-slate-800 p-3 text-center font-semibold text-white shadow-sm animate-in fade-in zoom-in duration-300">
                  {player.name} {player.connected ? "" : "(Disconnected)"}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
