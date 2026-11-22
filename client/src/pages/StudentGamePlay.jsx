import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Check, Clock3, Trophy, User, Wifi, WifiOff, X } from "lucide-react";
import { createKahootSocket } from "../utils/socket";

const SOUNDS = {
  correct: new Audio("https://actions.google.com/sounds/v1/cartoon/clown_horn.ogg"),
  incorrect: new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg"),
};

const SHAPES = [
  { color: "bg-red-500", hover: "hover:bg-red-600", symbol: "▲" },
  { color: "bg-blue-500", hover: "hover:bg-blue-600", symbol: "◆" },
  { color: "bg-yellow-500", hover: "hover:bg-yellow-600", symbol: "●" },
  { color: "bg-green-500", hover: "hover:bg-green-600", symbol: "■" },
];

const makePlayerId = () => {
  try {
    return window.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  } catch {
    return `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

const mapServerStatus = (status, answeredChoice) => {
  if (status === "question") return answeredChoice !== null && answeredChoice !== undefined ? "answered" : "playing";
  if (status === "reveal") return "reveal";
  if (status === "finished") return "finished";
  return "lobby";
};

export default function StudentGamePlay() {
  const navigate = useNavigate();
  const code = sessionStorage.getItem("kahoot_code");
  const [playerName, setPlayerName] = useState(() => sessionStorage.getItem("playerName") || "");
  const [nameDraft, setNameDraft] = useState(() => sessionStorage.getItem("playerName") || "");
  const [playerId] = useState(() => {
    const existing = sessionStorage.getItem("kahoot_playerId");
    const id = existing || makePlayerId();
    sessionStorage.setItem("kahoot_playerId", id);
    return id;
  });

  const socketRef = useRef(null);
  const revealTimerRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  const [gameState, setGameState] = useState("lobby");
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [myStats, setMyStats] = useState({ score: 0, rank: 0, correctCount: 0 });
  const [lastResult, setLastResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [connection, setConnection] = useState("connecting");
  const [error, setError] = useState("");

  const unlockAudio = () => {
    audioUnlockedRef.current = true;
  };

  const clearRevealTimer = () => {
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!code) {
      navigate("/game-join", { replace: true });
      return undefined;
    }
    if (!playerName) return undefined;

    let active = true;
    const socket = createKahootSocket();
    socketRef.current = socket;

    const joinGame = () => {
      if (!active) return;
      setConnection("connected");
      setError("");
      socket.emit("player_join", { code, name: playerName, playerId });
    };

    const onJoined = (snapshot) => {
      if (!active) return;
      clearRevealTimer();

      const mappedState = mapServerStatus(snapshot.status, snapshot.answeredChoice);
      setGameState(mappedState);
      setMyStats({
        score: snapshot.me?.score || 0,
        rank: snapshot.me?.rank || 0,
        correctCount: snapshot.me?.correctCount || 0,
      });
      setLeaderboard(Array.isArray(snapshot.leaderboard) ? snapshot.leaderboard : []);
      setSelectedChoice(snapshot.answeredChoice ?? null);

      if (snapshot.question) setQuestion(snapshot.question);
      if (snapshot.status === "question" && snapshot.question?.endsAt) {
        setTimeLeft(Math.max(0, Math.ceil((snapshot.question.endsAt - Date.now()) / 1000)));
      }

      if (snapshot.status === "reveal" || snapshot.status === "finished") {
        const result = snapshot.lastResult
          ? {
              ...snapshot.lastResult,
              correctAnswer: snapshot.reveal?.correctAnswer,
              correctIndex: snapshot.reveal?.correctIndex,
              explanation: snapshot.reveal?.explanation,
              leaderboard: snapshot.leaderboard || [],
            }
          : null;
        setLastResult(result);
      } else {
        setLastResult(null);
      }

      if (mappedState === "reveal") {
        revealTimerRef.current = window.setTimeout(() => {
          setGameState((current) => current === "reveal" ? "leaderboard" : current);
        }, 3000);
      }
    };

    const onQuestionStart = (nextQuestion) => {
      if (!active) return;
      clearRevealTimer();
      setQuestion(nextQuestion);
      setGameState("playing");
      setSelectedChoice(null);
      setLastResult(null);
      setTimeLeft(Math.max(0, Math.ceil((nextQuestion.endsAt - Date.now()) / 1000)));
    };

    const onAnswerLocked = ({ choice } = {}) => {
      if (!active) return;
      if (Number.isInteger(choice)) setSelectedChoice(choice);
      setGameState("answered");
    };

    const onAnswerResult = (result) => {
      if (!active) return;
      clearRevealTimer();
      setLastResult(result);
      setMyStats({
        score: result.score || 0,
        rank: result.rank || 0,
        correctCount: result.correctCount || 0,
      });
      setLeaderboard(Array.isArray(result.leaderboard) ? result.leaderboard : []);
      setGameState("reveal");

      if (audioUnlockedRef.current) {
        const sound = result.correct ? SOUNDS.correct : SOUNDS.incorrect;
        sound.currentTime = 0;
        sound.play().catch(() => {});
      }

      revealTimerRef.current = window.setTimeout(() => {
        setGameState((current) => current === "reveal" ? "leaderboard" : current);
      }, 3000);
    };

    const onGameFinished = (result) => {
      if (!active) return;
      clearRevealTimer();
      setGameState("finished");
      setLeaderboard(Array.isArray(result.leaderboard) ? result.leaderboard : []);
    };

    const onFinalResult = (result) => {
      if (!active) return;
      setMyStats({
        score: result.score || 0,
        rank: result.rank || 0,
        correctCount: result.correctCount || 0,
      });
      setGameState("finished");
    };

    const onGameError = (gameError) => {
      if (!active) return;
      setError(gameError?.message || "The game returned an error.");
    };

    socket.on("connect", joinGame);
    socket.on("connect_error", () => {
      if (active) setConnection("disconnected");
    });
    socket.on("disconnect", () => {
      if (active) setConnection("disconnected");
    });
    socket.on("joined", onJoined);
    socket.on("question_start", onQuestionStart);
    socket.on("answer_locked", onAnswerLocked);
    socket.on("answer_result", onAnswerResult);
    socket.on("game_finished", onGameFinished);
    socket.on("final_result", onFinalResult);
    socket.on("game_error", onGameError);

    if (socket.connected) joinGame();

    return () => {
      active = false;
      clearRevealTimer();
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [code, playerName, playerId, navigate]);

  useEffect(() => {
    if (gameState !== "playing" || !question?.endsAt) return undefined;

    const updateTimer = () => {
      setTimeLeft(Math.max(0, Math.ceil((question.endsAt - Date.now()) / 1000)));
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 200);
    return () => window.clearInterval(timer);
  }, [gameState, question?.endsAt]);

  const handleNameSubmit = (event) => {
    event.preventDefault();
    const cleanName = nameDraft.trim().replace(/\s+/g, " ");
    if (!cleanName) return;
    if (cleanName.length > 20) {
      setError("Your name must be 20 characters or fewer.");
      return;
    }
    sessionStorage.setItem("playerName", cleanName);
    setPlayerName(cleanName);
    setError("");
    unlockAudio();
  };

  const handleAnswer = (choiceIndex) => {
    const socket = socketRef.current;
    if (gameState !== "playing" || selectedChoice !== null || !socket?.connected) return;

    unlockAudio();
    setSelectedChoice(choiceIndex);
    setGameState("answered");
    socket.emit("player_answer", { choice: choiceIndex });
  };

  if (!code) return null;

  if (!playerName) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-white">
        <form onSubmit={handleNameSubmit} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-brand" />
          <h1 className="text-2xl font-black">Join Noted Quiz Show</h1>
          <p className="text-sm text-slate-400">Choose the name your teacher will see.</p>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value.slice(0, 20))}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-center text-xl text-white focus:border-brand focus:outline-none"
            placeholder="Your name"
            maxLength={20}
            autoFocus
          />
          <button type="submit" disabled={!nameDraft.trim()} className="w-full rounded-xl bg-brand py-4 font-bold text-white disabled:opacity-50">
            Continue
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400" /><span className="font-black">#{myStats.rank || "—"}</span></div>
        <div className="min-w-0 text-center">
          <p className="truncate font-black text-brand">{playerName}</p>
          <p className={`inline-flex items-center gap-1 text-xs ${connection === "connected" ? "text-green-300" : "text-yellow-300"}`}>
            {connection === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connection === "connected" ? "Connected" : "Reconnecting"}
          </p>
        </div>
        <div className="flex items-center gap-2"><span className="font-black tabular-nums">{myStats.score}</span><Trophy className="h-5 w-5 text-brand" /></div>
      </header>

      {error && <div role="alert" className="mx-auto mt-4 flex max-w-2xl items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

      <section className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center gap-6 p-4">
        {gameState === "lobby" && <div className="text-center"><User className="mx-auto mb-4 h-20 w-20 text-brand" /><h2 className="text-3xl font-black">You're in!</h2><p className="mt-2 text-slate-400">Waiting for your teacher to start.</p></div>}

        {gameState === "playing" && question && <div className="w-full max-w-3xl space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 text-xl font-black text-red-300"><Clock3 className="h-5 w-5" /> {timeLeft}s</div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Question {(question.index ?? 0) + 1} of {question.total || "—"}</p>
            <h2 className="mt-3 text-2xl font-black leading-tight md:text-4xl">{question.question}</h2>
          </div>
          {question.imageUrl && <img src={question.imageUrl} alt="Question illustration" className="mx-auto max-h-64 w-full rounded-xl bg-slate-800 object-contain" />}
          <div className="grid gap-3 sm:grid-cols-2">
            {(question.options || []).map((option, index) => {
              const shape = SHAPES[index] || { color: "bg-slate-700", hover: "hover:bg-slate-600", symbol: String(index + 1) };
              const selected = selectedChoice === index;
              return <button
                key={`${index}-${option}`}
                type="button"
                onClick={() => handleAnswer(index)}
                disabled={gameState !== "playing" || selectedChoice !== null || timeLeft <= 0 || connection !== "connected"}
                aria-pressed={selected}
                className={`flex min-h-24 items-center gap-4 rounded-2xl p-4 text-left text-lg font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70 ${shape.color} ${shape.hover} ${selected ? "ring-4 ring-white" : ""}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-black/20 text-2xl font-black">{shape.symbol}</span>
                <span className="break-words">{option}</span>
              </button>;
            })}
          </div>
        </div>}

        {gameState === "answered" && <div className="text-center"><Check className="mx-auto mb-4 h-20 w-20 text-green-400" /><h2 className="text-3xl font-black">Answer locked in!</h2><p className="mt-2 text-slate-400">Waiting for the results...</p></div>}

        {gameState === "reveal" && lastResult && <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center">
          {lastResult.correct ? <Check className="mx-auto h-16 w-16 text-green-400" /> : <X className="mx-auto h-16 w-16 text-red-400" />}
          <h2 className={`mt-3 text-4xl font-black ${lastResult.correct ? "text-green-400" : "text-red-400"}`}>{lastResult.correct ? "Correct!" : "Not quite"}</h2>
          {lastResult.points > 0 && <p className="mt-3 text-2xl font-black text-yellow-300">+{lastResult.points} points</p>}
          {lastResult.correctAnswer && <p className="mt-4 text-slate-300">Correct answer: <strong className="text-white">{lastResult.correctAnswer}</strong></p>}
          {lastResult.explanation && <p className="mt-3 text-sm text-slate-400">{lastResult.explanation}</p>}
          <p className="mt-6 text-xs text-slate-500">Leaderboard loading...</p>
        </div>}

        {(gameState === "leaderboard" || gameState === "finished") && <div className="w-full max-w-2xl space-y-5">
          <div className="text-center"><Trophy className="mx-auto h-12 w-12 text-yellow-400" /><h2 className="mt-2 text-3xl font-black">{gameState === "finished" ? "Final standings" : "Leaderboard"}</h2></div>
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            {leaderboard.map((player, index) => <div key={player.id || index} className={`flex items-center justify-between rounded-xl p-3 ${player.id === playerId ? "border border-brand bg-brand/15" : "bg-slate-800"}`}><span className="font-bold">{player.rank || index + 1}. {player.name}</span><span className="font-black text-brand">{player.score} pts</span></div>)}
            {!leaderboard.length && <p className="py-4 text-center text-slate-400">Waiting for leaderboard...</p>}
          </div>
          {gameState === "finished" && <button type="button" onClick={() => navigate("/")} className="w-full rounded-xl bg-brand py-3 font-bold text-white">Return to Noted</button>}
        </div>}

        {gameState === "lobby" && connection !== "connected" && <p className="inline-flex items-center gap-2 text-sm text-yellow-300"><WifiOff className="h-4 w-4" /> Reconnecting to the game...</p>}
      </section>
    </main>
  );
}
