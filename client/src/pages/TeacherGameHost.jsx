import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle, CheckCircle2, Clock3, Loader2, Monitor, Play,
  SkipForward, StopCircle, Users, Wifi, WifiOff, Trophy,
} from "lucide-react";
import { createKahootSocket } from "../utils/socket";

const formatStatus = (status) => {
  if (status === "question") return "Question in progress";
  if (status === "reveal") return "Answer reveal";
  if (status === "finished") return "Game finished";
  return "Waiting for players";
};

export default function TeacherGameHost() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [gameState, setGameState] = useState(null);
  const [connection, setConnection] = useState("connecting");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    let active = true;
    const socket = createKahootSocket();
    socketRef.current = socket;

    const token = localStorage.getItem("userToken") || localStorage.getItem("token");

    const joinAsHost = () => {
      if (!token) {
        setError("Your login session was not found. Please sign in again.");
        setIsLoading(false);
        return;
      }
      socket.emit("host_join", { quizId, token });
    };

    const onConnect = () => {
      if (!active) return;
      setConnection("connected");
      setError("");
      joinAsHost();
    };

    const onConnectError = (socketError) => {
      if (!active) return;
      console.error("[Kahoot host] Socket connection failed:", socketError.message);
      setConnection("disconnected");
      setError("Cannot reach the live game server. Reconnecting...");
      setIsLoading(false);
    };

    const onDisconnect = () => {
      if (active) setConnection("disconnected");
    };

    const onHostState = (state) => {
      if (!active) return;
      setGameState(state);
      setIsLoading(false);
      setError("");
    };

    const onPlayersUpdate = ({ players, count }) => {
      if (!active) return;
      setGameState((previous) => previous ? {
        ...previous,
        players: Array.isArray(players) ? players : previous.players,
        playerCount: count,
      } : previous);
    };

    const onGameStarted = () => {
      if (active) setGameState((previous) => previous ? { ...previous, status: "question" } : previous);
    };

    const onQuestionStart = (nextQuestion) => {
      if (!active) return;
      setGameState((previous) => ({
        ...(previous || {}),
        status: "question",
        question: nextQuestion,
        index: nextQuestion.index,
        total: nextQuestion.total,
        answered: 0,
        reveal: null,
      }));
      setError("");
    };

    const onQuestionEnd = (reveal) => {
      if (!active) return;
      setGameState((previous) => ({
        ...(previous || {}),
        status: "reveal",
        reveal,
        leaderboard: reveal.leaderboard || previous?.leaderboard || [],
      }));
    };

    const onAnswerCount = ({ answered, total }) => {
      if (!active) return;
      setGameState((previous) => previous ? {
        ...previous,
        answered: Number(answered) || 0,
        connectedPlayers: Number(total) || 0,
      } : previous);
    };

    const onGameFinished = (result) => {
      if (!active) return;
      setGameState((previous) => ({
        ...(previous || {}),
        status: "finished",
        leaderboard: result.leaderboard || previous?.leaderboard || [],
        finalPlayerCount: result.players ?? previous?.players?.length ?? 0,
      }));
    };

    const onGameError = (gameError) => {
      if (!active) return;
      setError(gameError?.message || "The game server returned an error.");
      setIsLoading(false);
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    socket.on("host_state", onHostState);
    socket.on("players_update", onPlayersUpdate);
    socket.on("game_started", onGameStarted);
    socket.on("question_start", onQuestionStart);
    socket.on("question_end", onQuestionEnd);
    socket.on("answer_count", onAnswerCount);
    socket.on("game_finished", onGameFinished);
    socket.on("game_error", onGameError);

    if (socket.connected) onConnect();

    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [quizId]);

  const status = gameState?.status || "lobby";
  const players = Array.isArray(gameState?.players) ? gameState.players : [];
  const connectedPlayers = players.filter((player) => player.connected !== false).length;
  const question = gameState?.question;
  const reveal = gameState?.reveal;
  const leaderboard = Array.isArray(gameState?.leaderboard) ? gameState.leaderboard : [];

  useEffect(() => {
    if (status !== "question" || !question?.endsAt) {
      setTimeLeft(0);
      return undefined;
    }
    const update = () => setTimeLeft(Math.max(0, Math.ceil((question.endsAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [status, question?.endsAt]);

  const emitHostAction = (eventName) => {
    const socket = socketRef.current;
    if (!socket?.connected || !gameState?.quizId) {
      setError("The game server is reconnecting. Try again when the connection returns.");
      return;
    }
    setError("");
    socket.emit(eventName, { quizId: gameState.quizId });
  };

  const handleEndGame = () => {
    if (window.confirm("End this game now? Students will see the final leaderboard.")) {
      emitHostAction("host_end");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-brand" />
        <p className="text-slate-300">Connecting to Noted Quiz Show...</p>
        <p className="mt-2 text-xs text-slate-500">Keep this tab open while the game is running.</p>
      </main>
    );
  }

  if (!gameState && error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-white">
        <section className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h1 className="text-xl font-bold">Unable to open this game</h1>
          <p className="mt-2 text-sm text-slate-300">{error}</p>
          <button type="button" onClick={() => navigate("/admin/kahoot")} className="mt-5 rounded-lg bg-brand px-4 py-2 font-semibold text-white">
            Back to creator
          </button>
        </section>
      </main>
    );
  }
  if (!gameState) return null;

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Monitor className="h-9 w-9 text-brand" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Noted Quiz Show</p>
              <h1 className="text-2xl font-black md:text-3xl">{gameState.title}</h1>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${connection === "connected" ? "bg-green-500/15 text-green-300" : "bg-yellow-500/15 text-yellow-300"}`}>
            {connection === "connected" ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {connection === "connected" ? "Connected" : "Reconnecting"}
          </div>
        </header>

        {error && <div role="status" className="flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

        <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-brand/40 bg-brand/10 p-6 text-center md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Students join at</p>
            <p className="mt-2 text-lg font-bold">usenotedai.com/game-join</p>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.25em] text-brand">Game PIN</p>
            <p className="mt-2 break-all text-5xl font-black tracking-widest md:text-7xl">{gameState.code || "LOADING"}</p>
            <p className="mt-4 text-sm text-slate-400">{formatStatus(status)}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-brand" /> Players</h2>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold tabular-nums">{connectedPlayers}{gameState.maxPlayers ? ` / ${gameState.maxPlayers}` : ""}</span>
            </div>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {players.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Waiting for students to join...</p> : players.map((player) => (
                <div key={player.id} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2">
                  <span className="truncate font-semibold">{player.name}</span>
                  <span className={`ml-3 text-xs ${player.connected ? "text-green-300" : "text-slate-500"}`}>{player.connected ? "Connected" : "Disconnected"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {status === "lobby" && <section className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <button type="button" onClick={() => emitHostAction("host_start")} disabled={!connectedPlayers || connection !== "connected"} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-7 py-4 text-lg font-black text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"><Play className="h-5 w-5 fill-current" /> Start game</button>
          <p className="w-full text-center text-sm text-slate-400">{connectedPlayers ? `${connectedPlayers} student(s) ready.` : "At least one student must join before you start."}</p>
        </section>}

        {status === "question" && question && <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-wider text-brand">Question {(question.index ?? 0) + 1} of {question.total || gameState.total}</p>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 text-xl font-black text-red-300"><Clock3 className="h-5 w-5" /> {timeLeft}s</div>
          </div>
          <h2 className="text-2xl font-black leading-tight md:text-4xl">{question.question}</h2>
          {question.imageUrl && <img src={question.imageUrl} alt="Question illustration" className="max-h-72 w-full rounded-xl bg-slate-800 object-contain" />}
          <div className="grid gap-3 sm:grid-cols-2">
            {(question.options || []).map((option, index) => <div key={`${index}-${option}`} className="flex items-center gap-3 rounded-xl bg-slate-800 p-4 text-lg font-semibold"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700 font-black">{["▲", "◆", "●", "■"][index] || index + 1}</span><span className="break-words">{option}</span></div>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <p className="text-sm text-slate-400">Answers received: <strong className="text-white">{gameState.answered || 0}</strong>{gameState.connectedPlayers != null ? ` / ${gameState.connectedPlayers}` : ""}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => emitHostAction("host_skip")} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 font-semibold hover:bg-slate-800"><SkipForward className="h-4 w-4" /> Reveal now</button>
              <button type="button" onClick={handleEndGame} className="inline-flex items-center gap-2 rounded-lg bg-red-600/15 px-4 py-2 font-semibold text-red-300 hover:bg-red-600/25"><StopCircle className="h-4 w-4" /> End game</button>
            </div>
          </div>
        </section>}

        {status === "reveal" && reveal && <section className="space-y-5 rounded-3xl border border-green-500/30 bg-green-500/5 p-5 md:p-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-green-300"><CheckCircle2 className="h-5 w-5" /> Correct answer</div>
          <h2 className="text-2xl font-black md:text-3xl">{reveal.correctAnswer}</h2>
          {reveal.explanation && <p className="text-slate-300">{reveal.explanation}</p>}
          <div className="grid gap-3 sm:grid-cols-2">{(reveal.counts || []).map((count, index) => <div key={index} className={`rounded-xl p-4 ${index === reveal.correctIndex ? "bg-green-500/20 ring-2 ring-green-400" : "bg-slate-800"}`}><p className="font-semibold">{question?.options?.[index] || `Option ${index + 1}`}</p><p className="mt-1 text-2xl font-black tabular-nums">{count}</p><p className="text-xs text-slate-400">answers</p></div>)}</div>
          {!gameState.autoStart ? <button type="button" onClick={() => emitHostAction("host_next")} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand/90"><SkipForward className="h-5 w-5" />{reveal.isLast ? "Show final results" : "Next question"}</button> : <p className="text-sm text-slate-400">The next question will start automatically.</p>}
        </section>}

        {status === "finished" && <section className="rounded-3xl border border-yellow-500/30 bg-slate-900 p-6 md:p-8">
          <div className="mb-5 text-center"><Trophy className="mx-auto h-12 w-12 text-yellow-400" /><h2 className="mt-2 text-3xl font-black">Final leaderboard</h2><p className="mt-1 text-sm text-slate-400">The game has ended.</p></div>
          <div className="mx-auto max-w-2xl space-y-2">{leaderboard.map((player, index) => <div key={player.id || index} className="flex items-center justify-between rounded-xl bg-slate-800 p-4"><span className="font-bold">{player.rank || index + 1}. {player.name}</span><span className="font-black text-brand">{player.score} pts</span></div>)}{!leaderboard.length && <p className="text-center text-slate-400">No player results are available.</p>}</div>
        </section>}
      </div>
    </main>
  );
}
