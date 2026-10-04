import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Trophy, ArrowLeft, RefreshCw, Play, Users, Activity, Wifi, WifiOff, CheckCircle2, XCircle,
  Zap, Award, Copy, Check, Plus, MoreVertical, Ban, Eye, EyeOff, X, Loader2, Lock, Clock,
} from "lucide-react";
import { io } from "socket.io-client";
import api from "../utils/api";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const socketUrl = apiUrl.replace(/\/api$/, "");

/* ------------------------------------------------------------------ */
/* Settings you may want to tweak                                      */
/* ------------------------------------------------------------------ */
const MIN_PLAYERS_TO_START = 2; // set to 1 if you want to test with a single student
const START_RETRY_MS = 5000;

// One colour per team, used everywhere (access codes, panels, player list).
const TEAMS = {
  1: {
    name: "Team 1",
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    soft: "bg-rose-500/10",
    border: "border-rose-500/30",
    button: "bg-rose-600 hover:bg-rose-700",
  },
  2: {
    name: "Team 2",
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
    soft: "bg-sky-500/10",
    border: "border-sky-500/30",
    button: "bg-sky-600 hover:bg-sky-700",
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const isAdminPlayer = (p) => p.role === "admin" || p.name === "Admin";
// The server should send `team` (1 or 2) on each player. Falls back to join order.
const getTeam = (player, idx) => player.team ?? idx + 1;

const totalSeconds = (quiz) =>
  quiz?.timeUnit === "minutes" ? (quiz.timeLimit || 0) * 60 : quiz?.timeLimit || 0;

const toEndsAt = (remainingMs, fallbackSeconds) => {
  if (typeof remainingMs === "number") return Date.now() + remainingMs;
  if (fallbackSeconds > 0) return Date.now() + fallbackSeconds * 1000;
  return null;
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const errorText = (err) =>
  typeof err === "string" ? err : err?.message || "Something went wrong.";

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function useCountdown(endsAt) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) { setSecondsLeft(0); return; }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return secondsLeft;
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Set());

  const push = useCallback((message, type = "info") => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
      timers.current.delete(timer);
    }, 3500);
    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  return { toasts, push };
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */
function ToastStack({ toasts }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
            t.type === "error" ? "border-destructive bg-destructive text-white" : "border-border bg-card text-foreground"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

function Modal({ title, icon, onClose, children, size = "max-w-sm", headerExtra }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[85dvh] w-full ${size} flex-col rounded-2xl border border-border bg-card shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-t-2xl border-b border-border bg-card p-4 sm:p-6">
          <h3 id={titleId} className="flex min-w-0 items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
            {icon}
            <span className="truncate">{title}</span>
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            {headerExtra}
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

const RESULT_BADGES = {
  correct: { cls: "bg-green-500/10 text-green-700 dark:text-green-400", Icon: CheckCircle2, label: "Correct" },
  wrong: { cls: "bg-destructive/10 text-destructive", Icon: XCircle, label: "Wrong" },
  steal: { cls: "bg-purple-500/10 text-purple-700 dark:text-purple-400", Icon: Zap, label: "Steal" },
};

function ResultBadge({ result }) {
  const cfg = RESULT_BADGES[result];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${cfg.cls}`}>
      <cfg.Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

function TeamCodeCard({ team, code, copied, onCopy }) {
  const t = TEAMS[team];
  return (
    <div className={`rounded-2xl border-2 p-4 text-center shadow-sm sm:p-5 ${t.border} ${t.soft}`}>
      <h4 className={`mb-3 flex items-center justify-center gap-2 text-lg font-bold ${t.text}`}>
        <span className={`h-3 w-3 rounded-full ${t.dot}`} aria-hidden="true" />
        {t.name} access code
      </h4>
      <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-background p-3">
        <span className="break-all font-mono text-xl font-bold tracking-wider text-foreground sm:text-3xl">{code}</span>
        <button
          onClick={onCopy}
          aria-label={`Copy ${t.name} code`}
          className={`shrink-0 rounded-lg p-3 text-white shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${t.button}`}
        >
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function TeamPanel({ team, info }) {
  const t = TEAMS[team];
  const offline = info.current?.connected === false;
  return (
    <section aria-label={`${t.name} results`} className="overflow-hidden rounded-xl border-2 border-border bg-muted/30">
      <div className={`border-b border-border p-4 text-center ${t.soft}`}>
        <h4 className="truncate text-xl font-bold text-foreground">
          {info.current?.name ?? "Waiting for player"}
        </h4>
        <p className={`mt-1 flex items-center justify-center gap-2 text-sm ${t.text}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} aria-hidden="true" />
          {t.name}
          {offline && <span className="text-muted-foreground">(disconnected)</span>}
        </p>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto p-4">
        {info.results.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No answers yet</p>
        ) : (
          info.results.map((result, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
              <span className="font-mono text-sm font-bold text-foreground">Card {result.cardIndex + 1}</span>
              <div className="flex items-center gap-2">
                <ResultBadge result={result.result} />
                <span className={`font-bold ${result.points > 0 ? "text-brand" : "text-muted-foreground"}`}>
                  {result.points > 0 ? `+${result.points}` : "0"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-brand/5 p-4">
        <span className="font-bold text-foreground">Total mark</span>
        <span className="text-2xl font-bold text-brand">{info.total} pts</span>
      </div>
    </section>
  );
}

function StatusChip({ connection, isLive, isComplete }) {
  let cfg;
  if (connection !== "connected") {
    cfg = { label: connection === "connecting" ? "Connecting" : "Reconnecting", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400", Icon: WifiOff };
  } else if (isComplete) {
    cfg = { label: "Finished", cls: "bg-muted text-muted-foreground", Icon: CheckCircle2 };
  } else if (isLive) {
    cfg = { label: "Live", cls: "bg-green-500/10 text-green-700 dark:text-green-400", Icon: Wifi };
  } else {
    cfg = { label: "Waiting to start", cls: "bg-brand/10 text-brand", Icon: Clock };
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${cfg.cls}`}>
      <cfg.Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export default function GameShowBoard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");

  const [quiz, setQuiz] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [activeCard, setActiveCard] = useState(null); // { index, player, isSteal? }
  const [endsAt, setEndsAt] = useState(null);
  const [connection, setConnection] = useState("connecting");
  const [fatalError, setFatalError] = useState("");

  const [replacementCode, setReplacementCode] = useState(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [hideAnswers, setHideAnswers] = useState(true); // safe default when the screen is projected
  const [menuFor, setMenuFor] = useState(null); // player name whose menu is open
  const [copiedKey, setCopiedKey] = useState(null);

  const { toasts, push: toast } = useToasts();
  const secondsLeft = useCountdown(endsAt);

  const socketRef = useRef(null);
  const hasStateRef = useRef(false);
  const quizRef = useRef(null);
  quizRef.current = quiz;
  const feedRef = useRef(null);
  const stickToBottom = useRef(true);
  const copyTimer = useRef(null);
  const startTimer = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(copyTimer.current);
      clearTimeout(startTimer.current);
    },
    []
  );

  /* ---------------- load quiz ---------------- */
  useEffect(() => {
    if (!code) { setFatalError("No game code in the URL."); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/quiz/game-show/${code}`);
        if (!cancelled) setQuiz(res.data.data);
      } catch (err) {
        console.error("Failed to load game show", err);
        if (!cancelled) {
          setFatalError("Failed to load the game. The code may be invalid, or you may not have permission to view it.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  /* ---------------- socket lifecycle ---------------- */
  useEffect(() => {
    const quizId = quiz?.quizId;
    if (!quizId) return;

    // Created here (not at module level) so the token is read at the time the admin
    // actually opens the board, and the connection closes when they leave.
    const token = localStorage.getItem("userToken");
    const socket = io(socketUrl, { withCredentials: true, auth: { token } });
    socketRef.current = socket;
    hasStateRef.current = false;
    setConnection("connecting");

    // "connect" fires on first connection AND after every reconnect.
    socket.on("connect", () => {
      setConnection("connected");
      socket.emit("join_game", { code, playerName: "Admin", role: "admin", quizId, token });
    });
    socket.on("disconnect", () => setConnection("disconnected"));
    socket.on("connect_error", (err) => {
      setConnection("disconnected");
      if (!socket.active) setFatalError(`Could not connect to the game server: ${errorText(err)}`);
    });

    socket.on("error", (err) => {
      const message = errorText(err);
      if (!hasStateRef.current) setFatalError(`Connection failed: ${message}`); // join failed
      else toast(message, "error"); // later errors shouldn't wipe the board
    });

    socket.on("game_state", (state) => {
      hasStateRef.current = true;
      setGameState(state);
      if (state.status === "live") setStartRequested(false);
      if (state.activeCard !== undefined) {
        const card = state.activeCard;
        setActiveCard(card ? { index: card.index, player: card.player, isSteal: !!card.isSteal } : null);
        setEndsAt(card ? toEndsAt(card.remainingMs, 0) : null);
      }
    });
    socket.on("game_started", (state) => {
      hasStateRef.current = true;
      setGameState(state);
      setStartRequested(false);
    });
    socket.on("player_joined", ({ players, status }) =>
      setGameState((prev) => ({ ...prev, players, status }))
    );
    socket.on("player_disqualified", ({ disqualified }) =>
      setGameState((prev) => ({ ...prev, disqualified }))
    );

    socket.on("card_locked", ({ cardIndex, playerName, remainingMs }) => {
      setActiveCard({ index: cardIndex, player: playerName });
      setEndsAt(toEndsAt(remainingMs, totalSeconds(quizRef.current)));
    });

    socket.on("answer_result", (data) => {
      setGameState((prev) => ({
        ...prev,
        scores: data.scores,
        cardResults: data.cardResults,
        completedCards: data.completedCards,
        activityLog: data.activityLog,
      }));
      if (data.isStealOpportunity && data.stealPlayer) {
        setActiveCard({ index: data.cardIndex, player: data.stealPlayer, isSteal: true });
        setEndsAt(toEndsAt(data.remainingMs, Math.ceil(totalSeconds(quizRef.current) / 2)));
      } else {
        setActiveCard(null);
        setEndsAt(null);
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [quiz?.quizId, code, toast]);

  /* ---------------- activity feed: only auto-scroll when already at the bottom ---------------- */
  const onFeedScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };
  useEffect(() => {
    const el = feedRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [gameState?.activityLog]);

  /* ---------------- close the player menu on outside click / Escape ---------------- */
  useEffect(() => {
    if (menuFor === null) return;
    const onPointerDown = (e) => {
      if (!e.target.closest?.("[data-player-menu]")) setMenuFor(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuFor(null); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuFor]);

  /* ---------------- actions ---------------- */
  const handleCopy = async (text, key) => {
    const ok = await copyToClipboard(text);
    if (!ok) return toast("Couldn't copy. Select the text and copy it manually.", "error");
    setCopiedKey(key);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleStartMatch = () => {
    if (!quiz?.quizId || startRequested) return;
    setStartRequested(true);
    socketRef.current?.emit("admin_start_game", { quizId: quiz.quizId });
    clearTimeout(startTimer.current);
    // If the server never confirms, let the admin try again.
    startTimer.current = setTimeout(() => setStartRequested(false), START_RETRY_MS);
  };

  const handleGenerateReplacementCode = async () => {
    if (!quiz?.quizId || isGeneratingCode) return;
    setIsGeneratingCode(true);
    try {
      const res = await api.post(`/quiz/${quiz.quizId}/regenerate-code`);
      setReplacementCode(res.data.newCode);
    } catch (err) {
      console.error("Failed to generate replacement code", err);
      toast(err.response?.data?.message || "Couldn't generate a new code. Try again.", "error");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const toggleDisqualify = (name) => {
    const current = gameState?.disqualified ?? [];
    const disqualify = !current.includes(name);
    // Optimistic update; the server's next game_state / player_disqualified is the source of truth.
    setGameState((prev) => {
      const list = prev?.disqualified ?? [];
      return { ...prev, disqualified: disqualify ? [...list, name] : list.filter((n) => n !== name) };
    });
    socketRef.current?.emit("disqualify_player", { quizId: quiz.quizId, playerName: name, disqualified: disqualify });
    setMenuFor(null);
    toast(disqualify ? `${name} disqualified` : `${name} restored`);
  };

  /* ================================================================ */
  /* Early states (all hooks are above this line)                       */
  /* ================================================================ */
  if (fatalError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-muted p-4 text-center">
        <XCircle className="mb-4 h-12 w-12 text-destructive" />
        <p className="mb-4 max-w-md text-lg font-semibold text-destructive">{fatalError}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" /> Refresh page
        </button>
      </div>
    );
  }

  if (!quiz || !gameState) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-muted">
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-brand" />
        <p className="font-medium text-foreground">{!quiz ? "Loading quiz data…" : "Connecting to game server…"}</p>
        {quiz && (
          <p className="text-xs text-muted-foreground">If this takes more than a few seconds, refresh the page.</p>
        )}
      </div>
    );
  }

  /* ================================================================ */
  /* Derived data                                                       */
  /* ================================================================ */
  const questions = quiz.questions ?? [];
  const players = (gameState.players ?? []).filter((p) => !isAdminPlayer(p));
  const scores = gameState.scores ?? {};
  const disqualified = gameState.disqualified ?? [];
  const cardResults = gameState.cardResults ?? [];
  const completed = gameState.completedCards ?? [];
  const isLive = gameState.status === "live";
  const isGameComplete = questions.length > 0 && completed.length >= questions.length;
  const connectedCount = players.filter((p) => p.connected !== false && !disqualified.includes(p.name)).length;
  const canStart = connection === "connected" && connectedCount >= MIN_PLAYERS_TO_START;

  const teamOfName = {};
  players.forEach((p, i) => { teamOfName[p.name] = getTeam(p, i); });

  const teamInfo = [1, 2].map((n) => {
    const members = players.filter((p, i) => getTeam(p, i) === n);
    const current = [...members].reverse().find((p) => p.connected !== false) ?? members[members.length - 1] ?? null;
    const names = new Set(members.map((p) => p.name));
    return {
      n,
      current,
      results: cardResults.filter((r) => names.has(r.player)),
      total: [...names].reduce((sum, name) => sum + (scores[name] ?? 0), 0),
    };
  });
  const [team1, team2] = teamInfo;
  const winnerText =
    team1.total > team2.total
      ? `${team1.current?.name ?? TEAMS[1].name} wins!`
      : team2.total > team1.total
      ? `${team2.current?.name ?? TEAMS[2].name} wins!`
      : "It's a tie!";

  const scoreRows = Object.entries(scores)
    .filter(([name]) => name.toLowerCase() !== "admin")
    .sort(([, a], [, b]) => b - a);

  const hasTeamCodes = quiz.accessCodes && quiz.accessCodes.length >= 2;

  /* ================================================================ */
  /* Render                                                             */
  /* ================================================================ */
  return (
    <div className="min-h-dvh bg-background p-3 sm:p-4 md:p-8">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/admin/quizzes")}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span>Exit to quizzes</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Reload game"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center">
          <h1 className="break-words text-xl font-bold leading-tight text-foreground sm:text-2xl">{quiz.title}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <button
              onClick={() => handleCopy(code, "game-code")}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Copy game code"
            >
              Code: {code}
              {copiedKey === "game-code" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <StatusChip connection={connection} isLive={isLive} isComplete={isGameComplete} />
          </div>
          <button
            onClick={() => setShowQuestions(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Eye className="h-4 w-4 text-brand" /> View all questions
          </button>
        </div>
      </div>

      {/* Team access codes */}
      {hasTeamCodes && (
        <div className="mx-auto mb-8 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((n) => (
            <TeamCodeCard
              key={n}
              team={n}
              code={quiz.accessCodes[n - 1]}
              copied={copiedKey === `code-${n}`}
              onCopy={() => handleCopy(quiz.accessCodes[n - 1], `code-${n}`)}
            />
          ))}
        </div>
      )}

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: players, start, scores */}
        <div className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <Users className="h-5 w-5 text-brand" /> Players joined
                </h3>
                <button
                  onClick={handleGenerateReplacementCode}
                  disabled={isGeneratingCode}
                  title="Generate a new code if a student disconnected"
                  className="flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                >
                  {isGeneratingCode ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  New code
                </button>
              </div>

              {players.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">Waiting for students to join…</p>
              ) : (
                <ul className="space-y-2">
                  {players.map((player, idx) => {
                    const team = getTeam(player, idx);
                    const t = TEAMS[team];
                    const isDQ = disqualified.includes(player.name);
                    const offline = player.connected === false;
                    const menuOpen = menuFor === player.name;
                    const teamCode = quiz.accessCodes?.[team - 1];
                    return (
                      <li
                        key={`${player.name}-${idx}`}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                          isDQ ? "border-destructive/20 bg-destructive/5 opacity-70" : "border-border bg-muted"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
                            t ? `${t.soft} ${t.text}` : "bg-brand/10 text-brand"
                          } ${isDQ ? "grayscale" : ""}`}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate font-medium ${isDQ ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {player.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t?.name ?? "Spectator"}
                            {isDQ ? " (disqualified)" : offline ? " (disconnected)" : ""}
                          </p>
                        </div>

                        {isLive && !isDQ && !offline && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 motion-safe:animate-pulse" aria-label="Active" />
                        )}

                        <div className="relative shrink-0" data-player-menu>
                          <button
                            onClick={() => setMenuFor(menuOpen ? null : player.name)}
                            aria-label={`Actions for ${player.name}`}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            className="rounded-lg p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuOpen && (
                            <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                              <button
                                role="menuitem"
                                onClick={() => toggleDisqualify(player.name)}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                              >
                                <Ban className="h-4 w-4" />
                                {isDQ ? "Restore player" : "Disqualify"}
                              </button>
                              {teamCode && (
                                <button
                                  role="menuitem"
                                  onClick={() => { handleCopy(teamCode, `menu-${player.name}`); setMenuFor(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                                >
                                  <Copy className="h-4 w-4" /> Copy {t?.name ?? "team"} code
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {!isLive ? (
              <div className="space-y-2">
                <button
                  onClick={handleStartMatch}
                  disabled={!canStart || startRequested}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-4 font-bold text-white shadow-lg shadow-green-500/20 transition hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {startRequested ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                  {startRequested ? "Starting…" : "Start live match"}
                </button>
                {!canStart && (
                  <p className="text-center text-xs text-muted-foreground">
                    {connection !== "connected"
                      ? "Waiting for the connection to come back."
                      : `Needs ${MIN_PLAYERS_TO_START} connected players to start (${connectedCount} so far).`}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-brand/20 bg-brand/10 p-4 text-center">
                <p className="font-bold text-brand">{isGameComplete ? "Match finished" : "Match is live"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isGameComplete ? "All cards have been played." : "Students can now pick cards."}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
              <Trophy className="h-5 w-5 text-yellow-500" /> Total scores
            </h3>
            {scoreRows.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Scores appear once the match starts.</p>
            ) : (
              <div className="space-y-3">
                {scoreRows.map(([name, score], idx) => {
                  const t = TEAMS[teamOfName[name]];
                  return (
                    <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-5 shrink-0 text-center text-sm font-bold text-muted-foreground">{idx + 1}</span>
                        {t && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />}
                        <span className="truncate font-semibold text-foreground">{name}</span>
                      </div>
                      <span className="shrink-0 text-xl font-bold text-brand">{score} pts</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: live results and feed. Moves to the top on small screens once the match is live. */}
        <div className={`space-y-6 lg:col-span-2 ${isLive ? "order-first lg:order-none" : ""}`}>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
              <Activity className="h-5 w-5 text-blue-500" /> Live battle results
            </h3>

            {activeCard && (
              <div className="mb-4 flex items-center justify-center gap-3 rounded-xl border border-border bg-muted p-3">
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="min-w-0 truncate text-sm font-medium text-foreground">
                  {activeCard.player} is {activeCard.isSteal ? "stealing" : "answering"}
                  {typeof activeCard.index === "number" ? ` card ${activeCard.index + 1}` : " a card"}
                </p>
                {endsAt && <span className="font-mono text-sm font-bold text-brand" role="timer">{formatTime(secondsLeft)}</span>}
              </div>
            )}

            <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <TeamPanel team={1} info={team1} />
              <TeamPanel team={2} info={team2} />
            </div>

            {isGameComplete && (
              <div className="mt-6 rounded-2xl border-2 border-brand/30 bg-gradient-to-r from-yellow-500/10 via-brand/10 to-purple-500/10 p-6 text-center animate-in fade-in zoom-in duration-500">
                <Award className="mx-auto mb-3 h-12 w-12 text-brand" />
                <h3 className="mb-2 text-2xl font-bold text-foreground">Game complete</h3>
                <p className="mb-4 text-muted-foreground">{winnerText}</p>
                <div className="grid grid-cols-2 gap-3 sm:gap-8">
                  {teamInfo.map((info) => (
                    <div key={info.n} className="min-w-0 text-center">
                      <p className="truncate font-bold text-foreground">{info.current?.name ?? TEAMS[info.n].name}</p>
                      <p className="text-2xl font-bold text-brand sm:text-3xl">{info.total} pts</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
              <Activity className="h-5 w-5 text-blue-500" /> Live activity feed
            </h3>
            <div ref={feedRef} onScroll={onFeedScroll} className="h-48 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
              {(gameState.activityLog ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm italic text-muted-foreground">
                  No activity yet. Events show up here once the match starts.
                </p>
              ) : (
                gameState.activityLog.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-lg p-2 text-sm transition hover:bg-muted/50">
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">{log.time}</span>
                    <span className="text-foreground">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replacement code modal */}
      {replacementCode && (
        <Modal title="New replacement code" onClose={() => setReplacementCode(null)}>
          <p className="mb-4 text-sm text-muted-foreground">
            Give this code to the student who disconnected. It connects them to this same live game.
          </p>
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-muted p-4">
            <span className="flex-1 break-all text-center font-mono text-2xl font-bold tracking-wider text-foreground">
              {replacementCode}
            </span>
            <button
              onClick={() => handleCopy(replacementCode, "replacement")}
              aria-label="Copy replacement code"
              className="shrink-0 rounded-lg bg-brand p-2.5 text-brand-foreground transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {copiedKey === "replacement" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <button
            onClick={() => setReplacementCode(null)}
            className="w-full rounded-xl bg-brand py-3 font-bold text-brand-foreground transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Done
          </button>
        </Modal>
      )}

      {/* Questions modal */}
      {showQuestions && (
        <Modal
          title={`All questions (${questions.length})`}
          icon={<Eye className="h-5 w-5 shrink-0 text-brand" />}
          size="max-w-3xl"
          onClose={() => setShowQuestions(false)}
          headerExtra={
            <button
              onClick={() => setHideAnswers((v) => !v)}
              aria-pressed={!hideAnswers}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {hideAnswers ? <><Eye className="h-4 w-4" /> Show answers</> : <><EyeOff className="h-4 w-4" /> Hide answers</>}
            </button>
          }
        >
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
                <p className="mb-3 break-words font-semibold text-foreground">
                  <span className="mr-2 text-brand">Q{idx + 1}.</span>
                  {q.question}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(q.options ?? []).map((opt, i) => {
                    const isCorrect = !hideAnswers && opt === q.correctAnswer;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2 break-words rounded-lg border p-3 text-sm ${
                          isCorrect
                            ? "border-green-500/30 bg-green-500/10 font-semibold text-green-700 dark:text-green-400"
                            : "border-border bg-card text-foreground"
                        }`}
                      >
                        <span className="shrink-0 font-bold">{String.fromCharCode(65 + i)}.</span>
                        <span className="flex-1">{opt}</span>
                        {isCorrect && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-label="Correct answer" />}
                      </div>
                    );
                  })}
                </div>
                {!hideAnswers && q.explanation && (
                  <div className="mt-3 rounded-lg border border-brand/10 bg-brand-soft/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Explanation:</span> {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
