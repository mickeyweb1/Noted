import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, RefreshCw, Play, Users, Activity, Wifi, CheckCircle2, XCircle, Zap, Award, Copy, Plus, MoreVertical, Ban, Eye, X, Loader2 } from "lucide-react";
import { io } from "socket.io-client";
import api from "../utils/api";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const socketUrl = apiUrl.replace(/\/api$/, ""); 

// ✅ Get the admin token from localStorage (same key used in api.js)
const token = localStorage.getItem('userToken');

const socket = io(socketUrl, { 
  withCredentials: true,
  auth: { token } // ✅ Send token so backend can verify admin
});

export default function GameShowBoard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");
  const feedRef = useRef(null);

  const [quiz, setQuiz] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [replacementCode, setReplacementCode] = useState(null);
  const [error, setError] = useState(""); 
  const [disqualifiedPlayers, setDisqualifiedPlayers] = useState([]);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);

  useEffect(() => {
    if (code) fetchQuizData();
  }, [code]);

  useEffect(() => {
    if (quiz?.quizId) {
      console.log("📡 Emitting join_game for quizId:", quiz.quizId);
      socket.emit("join_game", { code, playerName: "Admin", role: "admin", quizId: quiz.quizId,  token: localStorage.getItem('userToken') });
      
      // ✅ CRITICAL: Listen for backend errors so we don't get stuck loading forever
      socket.on("error", (errMsg) => {
        console.error("❌ Socket Error:", errMsg);
        setError(`Connection Failed: ${errMsg}`);
      });

      socket.on("game_state", (state) => {
        console.log("✅ Received game_state");
        setGameState(state);
      });
      socket.on("player_joined", ({ players, status }) => setGameState((prev) => ({ ...prev, players, status })));
      socket.on("game_started", (state) => setGameState(state));
      socket.on("answer_result", (data) => setGameState((prev) => ({ ...prev, scores: data.scores, cardResults: data.cardResults, completedCards: data.completedCards, activityLog: data.activityLog })));
      
      return () => {
        socket.off("error");
        socket.off("game_state"); 
        socket.off("player_joined"); 
        socket.off("game_started"); 
        socket.off("answer_result");
      };
    }
  }, [quiz, code]);

  useEffect(() => {
    if (feedRef.current && gameState?.activityLog) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [gameState?.activityLog]);

  const fetchQuizData = async () => {
    try {
      const res = await api.get(`/quiz/game-show/${code}`);
      setQuiz(res.data.data);
      setError(""); 
    } catch (err) { 
      console.error("Failed to load game show", err);
      setError("Failed to load game. Invalid code, or you do not have permission to view this game."); 
    }
  };

  const handleStartMatch = () => {
    if (quiz?.quizId) socket.emit("admin_start_game", { quizId: quiz.quizId });
  };

  const handleGenerateReplacementCode = async () => {
    if (!quiz?.quizId) return;
    try {
      const res = await api.post(`/quiz/${quiz.quizId}/regenerate-code`);
      setReplacementCode(res.data.newCode);
    } catch (err) {
      console.error("Failed to generate replacement code", err);
      alert("Failed to generate new code. Please try again.");
    }
  };

  // ✅ IMPROVED: Better Error UI with a Refresh button
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted p-4 text-center">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive font-semibold text-lg mb-2">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-brand text-brand-foreground rounded-lg hover:bg-brand/90 transition font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Page
        </button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-brand mb-2" />
        <p className="text-foreground font-medium">Loading Quiz Data...</p>
      </div>
    );
  }

  // ✅ IMPROVED: Better Loading UI with a spinner
  if (!gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-brand mb-2" />
        <p className="text-foreground font-medium">Connecting to Game Server...</p>
        <p className="text-xs text-muted-foreground">(If this stays, refresh the page)</p>
      </div>
    );
  }
  
  const isLive = gameState.status === "live";
  const isGameComplete = gameState.completedCards?.length === quiz.questions.length;
  const players = gameState.players.filter(p => p.name !== "Admin");

  const player1 = players[0]?.name || "Player 1";
  const player2 = players[1]?.name || "Player 2";
  const player1Results = gameState.cardResults?.filter(r => r.player === player1) || [];
  const player2Results = gameState.cardResults?.filter(r => r.player === player2) || [];
  const player1Total = player1Results.reduce((sum, r) => sum + r.points, 0);
  const player2Total = player2Results.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-8">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => navigate("/admin/quizzes")} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span>Exit to Quizzes</span>
          </button>
          <button onClick={() => window.location.reload()} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-accent" aria-label="Refresh game">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        <div className="text-center">
          <h1 className="break-words text-xl font-bold leading-tight text-foreground sm:text-2xl">{quiz.title}</h1>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-2 font-mono text-xs text-muted-foreground sm:text-sm">
            <span>Code: {code}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600">
              <Wifi className="h-3 w-3" /> Live
            </span>
          </p>
          <button
            onClick={() => setShowQuestionsModal(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent shadow-sm"
          >
            <Eye className="h-4 w-4 text-brand" /> View All Questions
          </button>
        </div>
      </div>

      {quiz?.accessCodes && quiz.accessCodes.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-4xl mx-auto">
          <div className="bg-brand/10 border-2 border-brand/30 rounded-2xl p-4 sm:p-5 text-center shadow-sm">
            <h4 className="text-lg font-bold text-brand mb-3 flex items-center justify-center gap-2">🔴 TEAM 1 ACCESS CODE</h4>
            <div className="flex items-center justify-center gap-3 bg-background rounded-xl p-3 border border-border">
              <span className="break-all text-xl font-mono font-bold tracking-wider text-foreground sm:text-3xl">{quiz.accessCodes[0]}</span>
              <button onClick={() => navigator.clipboard.writeText(quiz.accessCodes[0])} className="p-3 rounded-lg bg-brand text-white hover:bg-brand/90 transition shadow-md shrink-0" title="Copy Team 1 Code">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="bg-purple-500/10 border-2 border-purple-500/30 rounded-2xl p-4 sm:p-5 text-center shadow-sm">
            <h4 className="text-lg font-bold text-purple-600 mb-3 flex items-center justify-center gap-2">🔵 TEAM 2 ACCESS CODE</h4>
            <div className="flex items-center justify-center gap-3 bg-background rounded-xl p-3 border border-border">
              <span className="break-all text-xl font-mono font-bold tracking-wider text-foreground sm:text-3xl">{quiz.accessCodes[1]}</span>
              <button onClick={() => navigator.clipboard.writeText(quiz.accessCodes[1])} className="p-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition shadow-md shrink-0" title="Copy Team 2 Code">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2"><Users className="w-5 h-5 text-brand" /> Players Joined</h3>
                <button onClick={handleGenerateReplacementCode} className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition font-medium" title="Generate a new code if a student disconnected">
                  <Plus className="w-3 h-3" /> New Code
                </button>
              </div>
              
              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Waiting for students to join...</p>
              ) : (
                <ul className="space-y-2">
                  {players.map((player, idx) => {
                    const isDisqualified = disqualifiedPlayers.includes(player.name);
                    return (
                      <li key={idx} className={`flex items-center gap-3 p-3 rounded-xl border border-border transition-all ${isDisqualified ? "bg-destructive/5 border-destructive/20 opacity-60" : "bg-muted"}`}>
                        <div className={`w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold ${isDisqualified ? "grayscale" : ""}`}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`font-medium flex-1 ${isDisqualified ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {player.name}
                        </span>
                        
                        <div className="relative group">
                          <button className="p-2 rounded-lg hover:bg-accent">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg hidden group-hover:block z-10">
                            <button 
  onClick={() => {
    // Update local UI
    setDisqualifiedPlayers(prev => 
      prev.includes(player.name) ? prev.filter(n => n !== player.name) : [...prev, player.name]
    );
    // ✅ Tell the server to enforce it
    socket.emit("disqualify_player", { quizId: quiz.quizId, playerName: player.name });
  }}
  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
>
  <Ban className="w-4 h-4" />
  {isDisqualified ? "Restore Player" : "Disqualify"}
</button>
                            <button 
                              onClick={() => { navigator.clipboard.writeText(quiz.accessCodes[idx] || code); alert("Code Copied!"); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" /> Copy Code
                            </button>
                          </div>
                        </div>
                        
                        {isLive && !isDisqualified && <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {!isLive ? (
              <button onClick={handleStartMatch} disabled={players.length === 0} className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 py-4 font-bold text-white hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20">
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

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-6"><Activity className="w-5 h-5 text-blue-500" /> Live Battle Results</h3>
            <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-xl border-2 border-border bg-muted/30 overflow-hidden">
                <div className="bg-brand/10 border-b border-border p-4 text-center">
                  <h4 className="text-xl font-bold text-foreground">{player1}</h4>
                  <p className="text-sm text-muted-foreground">Team 1</p>
                </div>
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                  {player1Results.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">No answers yet</p>
                  ) : (
                    player1Results.map((result, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                        <span className="font-mono text-sm font-bold text-foreground">Card #{result.cardIndex + 1}</span>
                        <div className="flex items-center gap-2">
                          {result.result === 'correct' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Correct</span>}
                          {result.result === 'wrong' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold"><XCircle className="w-3 h-3" /> Wrong</span>}
                          {result.result === 'steal' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold"><Zap className="w-3 h-3" /> Steal</span>}
                          <span className={`font-bold ${result.points > 0 ? "text-brand" : "text-muted-foreground"}`}>{result.points > 0 ? `+${result.points}` : '0'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-border p-4 bg-brand/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Total Mark</span>
                    <span className="text-2xl font-bold text-brand">{player1Total} pts</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-border bg-muted/30 overflow-hidden">
                <div className="bg-brand/10 border-b border-border p-4 text-center">
                  <h4 className="text-xl font-bold text-foreground">{player2}</h4>
                  <p className="text-sm text-muted-foreground">Team 2</p>
                </div>
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                  {player2Results.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">No answers yet</p>
                  ) : (
                    player2Results.map((result, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                        <span className="font-mono text-sm font-bold text-foreground">Card #{result.cardIndex + 1}</span>
                        <div className="flex items-center gap-2">
                          {result.result === 'correct' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Correct</span>}
                          {result.result === 'wrong' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold"><XCircle className="w-3 h-3" /> Wrong</span>}
                          {result.result === 'steal' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold"><Zap className="w-3 h-3" /> Steal</span>}
                          <span className={`font-bold ${result.points > 0 ? "text-brand" : "text-muted-foreground"}`}>{result.points > 0 ? `+${result.points}` : '0'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-border p-4 bg-brand/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Total Mark</span>
                    <span className="text-2xl font-bold text-brand">{player2Total} pts</span>
                  </div>
                </div>
              </div>
            </div>

            {isGameComplete && (
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-brand/10 to-purple-500/10 border-2 border-brand/30 text-center animate-in fade-in zoom-in duration-500">
                <Award className="w-12 h-12 text-brand mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-foreground mb-2">🏆 Game Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  {player1Total > player2Total ? `${player1} wins!` : player2Total > player1Total ? `${player2} wins!` : "It's a tie!"}
                </p>
                <div className="grid grid-cols-2 gap-3 text-base sm:gap-8 sm:text-xl">
                  <div className="text-center">
                    <p className="font-bold text-foreground">{player1}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-brand">{player1Total} pts</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-foreground">{player2}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-brand">{player2Total} pts</p>
                  </div>
                </div>
              </div>
            )}
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

      {/* Replacement Code Modal */}
      {replacementCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-foreground mb-2">New Replacement Code Generated!</h3>
            <p className="text-sm text-muted-foreground mb-4">Give this new code to the student who disconnected. It will connect them to this exact same live game.</p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-4 mb-6">
              <span className="flex-1 font-mono text-2xl font-bold tracking-wider text-foreground text-center">{replacementCode}</span>
              <button onClick={() => navigator.clipboard.writeText(replacementCode)} className="shrink-0 rounded-lg bg-brand p-2.5 text-brand-foreground hover:bg-brand/90 transition" title="Copy code">
                <Copy className="h-5 w-5" />
              </button>
            </div>
            <button onClick={() => setReplacementCode(null)} className="w-full rounded-xl bg-brand py-3 font-bold text-brand-foreground hover:bg-brand/90 transition">Done</button>
          </div>
        </div>
      )}

       {/* ✅ POLISHED: View All Questions Modal */}
      {showQuestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header (Sticky) */}
            <div className="flex justify-between items-center p-6 border-b border-border bg-card rounded-t-2xl shrink-0">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Eye className="w-5 h-5 text-brand" /> All Questions ({quiz.questions.length})
              </h3>
              <button onClick={() => setShowQuestionsModal(false)} className="p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {quiz.questions.map((q, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <p className="font-semibold text-foreground mb-3 break-words">
                    <span className="text-brand mr-2">Q{idx + 1}.</span> 
                    {q.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg border text-sm break-words flex items-start gap-2 ${
                          opt === q.correctAnswer 
                            ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 font-semibold' 
                            : 'bg-card border-border text-foreground'
                        }`}
                      >
                        <span className="font-bold shrink-0">{String.fromCharCode(65 + i)}.</span>
                        <span className="flex-1">{opt}</span>
                        {opt === q.correctAnswer && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 p-3 rounded-lg bg-brand-soft/50 border border-brand/10">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">💡 Explanation:</span> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
