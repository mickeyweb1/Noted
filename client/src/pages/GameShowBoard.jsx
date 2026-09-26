import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, RefreshCw, Play, Users, Activity } from "lucide-react";
import { io } from "socket.io-client";
import api from "../utils/api";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
  withCredentials: true,
});

export default function GameShowBoard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");

  const [quiz, setQuiz] = useState(null);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    if (code) {
      fetchQuizData();
      
      // Join as admin (we use "Admin" as the placeholder name)
      socket.emit("join_game", { code, playerName: "Admin" });

      socket.on("game_state", (state) => setGameState(state));
      socket.on("player_joined", ({ players, status }) => {
        setGameState((prev) => ({ ...prev, players, status }));
      });
      socket.on("game_started", (state) => setGameState(state));
      socket.on("answer_result", ({ scores, activityLog }) => {
        setGameState((prev) => ({ ...prev, scores, activityLog }));
      });

      return () => {
        socket.off("game_state");
        socket.off("player_joined");
        socket.off("game_started");
        socket.off("answer_result");
      };
    }
  }, [code]);

  const fetchQuizData = async () => {
    try {
      const res = await api.post("/quiz/validate-code", { code });
      setQuiz(res.data.data);
    } catch (err) {
      console.error("Failed to load game show", err);
    }
  };

  const handleStartMatch = () => {
    socket.emit("admin_start_game", { code });
  };

  if (!quiz || !gameState) {
    return <div className="min-h-screen flex items-center justify-center bg-muted"><p>Loading Game Control Panel...</p></div>;
  }

  const isLive = gameState.status === "live";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate("/admin/quizzes")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-5 h-5" /> Exit to Quizzes
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{quiz.title}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Code: {code}</p>
        </div>
        <button onClick={() => window.location.reload()} className="p-2 rounded-lg hover:bg-accent transition"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        
        {/* LEFT: Player List & Controls */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-brand" /> Players Joined
            </h3>
            {gameState.players.filter(p => p !== "Admin").length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Waiting for students to join...</p>
            ) : (
              <ul className="space-y-2">
                {gameState.players.filter(p => p !== "Admin").map((player, idx) => (
                  <li key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                      {player.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{player}</span>
                    {isLive && <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!isLive ? (
            <button 
              onClick={handleStartMatch}
              disabled={gameState.players.filter(p => p !== "Admin").length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 py-4 font-bold text-white hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
            >
              <Play className="w-5 h-5" /> Start Live Match
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-brand/10 border border-brand/20 text-center">
              <p className="font-bold text-brand">🔴 MATCH IS LIVE</p>
              <p className="text-xs text-muted-foreground mt-1">Students can now pick cards.</p>
            </div>
          )}
        </div>

        {/* RIGHT: Premium Score Table & Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Premium Score Table */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" /> Live Scoreboard
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Rank</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Player</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(gameState.scores)
                    .filter(([name]) => name !== "Admin")
                    .sort(([,a], [,b]) => b - a)
                    .map(([name, score], idx) => (
                      <tr key={name} className="group hover:bg-muted/50 transition">
                        <td className="py-4">
                          <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full font-bold ${
                            idx === 0 ? "bg-yellow-500/10 text-yellow-600" : 
                            idx === 1 ? "bg-gray-400/10 text-gray-600" : "bg-muted text-muted-foreground"
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-4 font-semibold text-foreground">{name}</td>
                        <td className="py-4 text-right">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-3 py-1 font-bold text-brand">
                            {score} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-500" /> Live Match Feed
            </h3>
            <div className="h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {gameState.activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-8">No activity yet. Waiting for match to start...</p>
              ) : (
                gameState.activityLog.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition">
                    <span className="font-mono text-xs text-muted-foreground mt-0.5 shrink-0">{log.time}</span>
                    <span className="text-foreground">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
