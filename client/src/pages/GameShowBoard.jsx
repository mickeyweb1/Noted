import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, RefreshCw, Play, Users, Activity, Wifi, CheckCircle2, XCircle, Zap } from "lucide-react";
import { io } from "socket.io-client";
import api from "../utils/api";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const socketUrl = apiUrl.replace(/\/api$/, ""); 

const socket = io(socketUrl, { withCredentials: true });

export default function GameShowBoard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");
  const feedRef = useRef(null);

  const [quiz, setQuiz] = useState(null);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    if (code) fetchQuizData();
  }, [code]);

  useEffect(() => {
    if (quiz?.quizId) {
      socket.emit("join_game", { code, playerName: "Admin", role: "admin", quizId: quiz.quizId });
      socket.on("game_state", (state) => setGameState(state));
      socket.on("player_joined", ({ players, status }) => setGameState((prev) => ({ ...prev, players, status })));
      socket.on("game_started", (state) => setGameState(state));
      socket.on("answer_result", (data) => setGameState((prev) => ({ ...prev, scores: data.scores, cardResults: data.cardResults, activityLog: data.activityLog })));
      return () => {
        socket.off("game_state"); socket.off("player_joined"); socket.off("game_started"); socket.off("answer_result");
      };
    }
  }, [quiz, code]);

  useEffect(() => {
    if (feedRef.current && gameState?.activityLog) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [gameState?.activityLog]);

  const fetchQuizData = async () => {
    try {
      const res = await api.post("/quiz/validate-code", { code });
      setQuiz(res.data.data);
    } catch (err) { console.error("Failed to load game show", err); }
  };

  const handleStartMatch = () => {
    if (quiz?.quizId) socket.emit("admin_start_game", { quizId: quiz.quizId });
  };

  if (!quiz || !gameState || !gameState.scores) {
    return <div className="min-h-screen flex items-center justify-center bg-muted"><p>Loading Game Control Panel...</p></div>;
  }

  const isLive = gameState.status === "live";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate("/admin/quizzes")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-5 h-5" /> Exit to Quizzes
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{quiz.title}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1 flex items-center justify-center gap-2">
            Code: {code} 
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium"><Wifi className="w-3 h-3" /> Live</span>
          </p>
        </div>
        <button onClick={() => window.location.reload()} className="p-2 rounded-lg hover:bg-accent transition"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* LEFT: Controls & Overall Score */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-brand" /> Players Joined</h3>
              {gameState.players.filter(p => p.name !== "Admin").length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Waiting for students to join...</p>
              ) : (
                <ul className="space-y-2">
                  {gameState.players.filter(p => p.name !== "Admin").map((player, idx) => (
                    <li key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
                      <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">{player.name.charAt(0).toUpperCase()}</div>
                      <span className="font-medium text-foreground">{player.name}</span>
                      {isLive && <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {!isLive ? (
              <button onClick={handleStartMatch} disabled={gameState.players.filter(p => p.name !== "Admin").length === 0} className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 py-4 font-bold text-white hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20">
                <Play className="w-5 h-5" /> Start Live Match
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-brand/10 border border-brand/20 text-center animate-pulse">
                <p className="font-bold text-brand">🔴 MATCH IS LIVE</p>
                <p className="text-xs text-muted-foreground mt-1">Students can now pick cards.</p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Trophy className="w-5 h-5 text-yellow-500" /> Total Scores</h3>
            <div className="space-y-3">
              {Object.entries(gameState.scores || {}).filter(([name]) => name !== "Admin").sort(([,a], [,b]) => b - a).map(([name, score], idx) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                  <span className="font-semibold text-foreground">{name}</span>
                  <span className="font-bold text-brand text-xl">{score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Premium Match History Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-blue-500" /> Match History & Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Card #</th>
                    <th className="pb-3 text-sm font-medium text-muted-iguous">Player</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Result</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(gameState.cardResults || []).length === 0 ? (
                    <tr><td colSpan="4" className="py-8 text-center text-sm text-muted-foreground italic">No cards answered yet.</td></tr>
                  ) : (
                    (gameState.cardResults || []).map((result, idx) => (
                      <tr key={idx} className="group hover:bg-muted/50 transition">
                        <td className="py-4 font-mono font-bold text-foreground">#{result.cardIndex + 1}</td>
                        <td className="py-4 font-semibold text-foreground">{result.player}</td>
                        <td className="py-4">
                          {result.result === 'correct' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Correct</span>}
                          {result.result === 'wrong' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold"><XCircle className="w-3.5 h-3.5" /> Wrong</span>}
                          {result.result === 'steal' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold"><Zap className="w-3.5 h-3.5" /> Steal!</span>}
                        </td>
                        <td className="py-4 text-right">
                          <span className={`font-bold ${result.points > 0 ? "text-brand" : "text-muted-foreground"}`}>
                            {result.points > 0 ? `+${result.points}` : '0'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-blue-500" /> Live Activity Feed</h3>
            <div ref={feedRef} className="h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar scroll-smooth">
              {(gameState.activityLog || []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-8">No activity yet. Waiting for match to start...</p>
              ) : (
                (gameState.activityLog || []).map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition animate-in fade-in slide-in-from-bottom-2 duration-300">
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
