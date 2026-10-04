import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Trophy, User, CheckCircle2, XCircle, Clock, Wifi, WifiOff, Award,
  Medal, ListChecks, Zap, Info, Ban, Lock, Loader2,
} from "lucide-react";
import { io } from "socket.io-client";
import api from "../utils/api";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const socketUrl = apiUrl.replace(/\/api$/, "");

/* ------------------------------------------------------------------ */
/* Settings you may want to tweak                                      */
/* ------------------------------------------------------------------ */
const MAX_NAME_LENGTH = 20;
const RESERVED_NAMES = ["admin"];
// When the timer runs out: true = submit the option the student already selected,
// false = always submit "skip" (the old behaviour).
const AUTO_SUBMIT_SELECTED = true;
const FEEDBACK_MS = 3500;
const PICK_TIMEOUT_MS = 4000;
const CONFETTI_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const totalSeconds = (quiz) =>
  quiz?.timeUnit === "minutes" ? (quiz.timeLimit || 0) * 60 : quiz?.timeLimit || 0;

// The server should send `remainingMs` (no clock-skew problems). If it doesn't,
// fall back to the quiz's configured time limit.
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
  typeof err === "string" ? err : err?.message || "Something went wrong. Please try again.";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const nameKey = (code) => `gameshow:name:${code}`;
const readSavedName = (code) => {
  try { return sessionStorage.getItem(nameKey(code)) || ""; } catch { return ""; }
};
const saveName = (code, name) => {
  try { sessionStorage.setItem(nameKey(code), name); } catch { /* ignore */ }
};
const clearSavedName = (code) => {
  try { sessionStorage.removeItem(nameKey(code)); } catch { /* ignore */ }
};

/* ------------------------------------------------------------------ */
/* Countdown based on a deadline, so background tabs can't drift       */
/* ------------------------------------------------------------------ */
function useCountdown(endsAt, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; });

  useEffect(() => {
    if (!endsAt) { setSecondsLeft(0); return; }
    let expired = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !expired) {
        expired = true;
        clearInterval(id);
        onExpireRef.current?.();
      }
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [endsAt]);

  return secondsLeft;
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */
function Confetti() {
  // useMemo: pieces must not be re-randomised on every re-render
  const pieces = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((c) => (
        <div
          key={c.id}
          className="absolute h-3 w-3 rounded-full"
          style={{
            left: c.left,
            top: "-20px",
            backgroundColor: c.color,
            animation: `gs-fall 3s ease-in ${c.delay} forwards`,
          }}
        />
      ))}
      <style>{`@keyframes gs-fall { to { transform: translateY(100vh) rotate(360deg); opacity: 0; } }`}</style>
    </div>
  );
}

function ConnectionBanner({ connection }) {
  if (connection === "connected") return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
    >
      <WifiOff className="h-4 w-4" />
      {connection === "connecting" ? "Connecting…" : "Connection lost. Reconnecting…"}
    </div>
  );
}

const FEEDBACK_STYLES = {
  success: { cls: "border-green-400 bg-green-500 text-white", Icon: CheckCircle2 },
  steal: { cls: "animate-pulse border-purple-400 bg-purple-600 text-white", Icon: Zap },
  error: { cls: "border-destructive bg-destructive text-white", Icon: XCircle },
  info: { cls: "border-border bg-card text-foreground", Icon: Info },
};

function FeedbackToast({ feedback }) {
  if (!feedback) return null;
  const { cls, Icon } = FEEDBACK_STYLES[feedback.type] || FEEDBACK_STYLES.info;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-14 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${cls}`}
    >
      <Icon className="h-6 w-6 shrink-0" />
      <span className="text-base font-bold sm:text-lg">{feedback.message}</span>
    </div>
  );
}

function PodiumSpot({ entry }) {
  const first = entry.rank === 1;
  return (
    <div className="flex min-w-0 flex-col items-center">
      {first ? (
        <Trophy className="mb-2 h-14 w-14 text-yellow-500" />
      ) : (
        <Medal className="mb-2 h-10 w-10 text-gray-400" />
      )}
      <div
        className={`mb-4 flex items-center justify-center rounded-2xl border-2 px-2 ${
          first
            ? "h-32 w-32 border-4 border-yellow-500/30 bg-yellow-500/10 shadow-lg shadow-yellow-500/20 md:h-40 md:w-40"
            : "h-24 w-24 border-gray-400/30 bg-gray-400/10 md:h-32 md:w-32"
        }`}
      >
        <div className="min-w-0 text-center">
          <p className={`truncate font-bold text-foreground ${first ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"}`}>
            {entry.name}
          </p>
          <p className="text-lg font-bold text-brand">{entry.score} pts</p>
        </div>
      </div>
      <div
        className={`flex items-center justify-center rounded-t-lg ${
          first ? "h-20 w-32 bg-yellow-500/20 md:h-24 md:w-40" : "h-14 w-24 bg-gray-400/20 md:h-16 md:w-32"
        }`}
      >
        <span className={`font-bold ${first ? "text-4xl text-yellow-600" : "text-3xl text-gray-500"}`}>
          {entry.rank}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export default function GameShowLobby() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");

  const [step, setStep] = useState("enter-name"); // enter-name | waiting | playing | game-over
  const [studentName, setStudentName] = useState("");
  const [session, setSession] = useState(null); // { quizId, name, total } once validated
  const [quizData, setQuizData] = useState(null);
  const [gameState, setGameState] = useState(null);

  const [activeCard, setActiveCard] = useState(null); // { index, player, isSteal? }
  const [endsAt, setEndsAt] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [pendingPick, setPendingPick] = useState(null);

  const [connection, setConnection] = useState("connecting");
  const [formError, setFormError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [review, setReview] = useState(null); // optional: [{ cardIndex, correctAnswer, explanation }]

  const socketRef = useRef(null);
  const hasStateRef = useRef(false);
  const submittingRef = useRef(false);
  const feedbackTimer = useRef(null);
  const pickTimer = useRef(null);
  const confirmTimer = useRef(null);
  const confettiTimer = useRef(null);

  // Always-current values for socket handlers, so listeners are registered once.
  const latest = useRef({});
  latest.current = { session, quizData, activeCard, selectedAnswer };

  useEffect(
    () => () => {
      clearTimeout(feedbackTimer.current);
      clearTimeout(pickTimer.current);
      clearTimeout(confirmTimer.current);
      clearTimeout(confettiTimer.current);
    },
    []
  );

  const showFeedback = useCallback((type, message) => {
    clearTimeout(feedbackTimer.current);
    setFeedback({ type, message });
    feedbackTimer.current = setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }, []);

  const resetTurn = useCallback(() => {
    submittingRef.current = false;
    setIsSubmitting(false);
    setSelectedAnswer(null);
    setConfirmSkip(false);
    setActiveCard(null);
    setEndsAt(null);
  }, []);

  /* ---------------- submitting an answer ---------------- */
  const submitAnswer = useCallback((answerIndex) => {
    const { session: s, activeCard: card } = latest.current;
    if (!s || !card || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    socketRef.current?.emit("submit_answer", {
      quizId: s.quizId,
      cardIndex: card.index,
      selectedAnswerIndex: answerIndex,
      playerName: s.name,
    });
  }, []);

  // Only the student who holds the card submits when time runs out.
  const handleExpire = useCallback(() => {
    const { session: s, activeCard: card, selectedAnswer: picked } = latest.current;
    if (!s || !card || card.player !== s.name) return;
    submitAnswer(AUTO_SUBMIT_SELECTED && picked !== null ? picked : -1);
  }, [submitAnswer]);

  const secondsLeft = useCountdown(endsAt, handleExpire);

  /* ---------------- applying server state ---------------- */
  const applyGameState = useCallback((state) => {
    const { session: s } = latest.current;
    hasStateRef.current = true;
    setFatalError("");
    setGameState(state);

    const done =
      !!s && s.total > 0 && (state.completedCards?.length ?? 0) >= s.total;
    if (done) setStep("game-over");
    else if (state.status === "live") setStep("playing");
    else setStep("waiting");

    // Optional: lets a reconnecting student see the card that is currently locked.
    if (state.activeCard !== undefined) {
      const card = state.activeCard;
      if (card) {
        setActiveCard({ index: card.index, player: card.player, isSteal: !!card.isSteal });
        setEndsAt(toEndsAt(card.remainingMs, 0));
      } else {
        setActiveCard(null);
        setEndsAt(null);
      }
    }
  }, []);

  /* ---------------- socket lifecycle ---------------- */
  useEffect(() => {
    if (!session) return;

    const socket = io(socketUrl, { withCredentials: true });
    socketRef.current = socket;
    hasStateRef.current = false;
    setConnection("connecting");

    const join = () =>
      socket.emit("join_game", {
        code,
        playerName: session.name,
        role: "student",
        quizId: session.quizId,
      });

    // "connect" fires on the first connection AND after every reconnect.
    socket.on("connect", () => {
      setConnection("connected");
      join();
    });
    socket.on("disconnect", () => setConnection("disconnected"));
    socket.on("connect_error", (err) => {
      setConnection("disconnected");
      if (!socket.active) setFatalError(`Could not connect to the game: ${errorText(err)}`);
    });

    socket.on("error", (err) => {
      const message = errorText(err);
      // Before we ever received the game state, an error means the join failed.
      if (!hasStateRef.current) {
        setFatalError(message);
        return;
      }
      submittingRef.current = false;
      setIsSubmitting(false);
      setPendingPick(null);
      showFeedback("error", message);
    });

    socket.on("game_state", applyGameState);
    socket.on("game_started", (state) => applyGameState({ ...state, status: state?.status ?? "live" }));
    socket.on("player_joined", ({ players, status }) =>
      setGameState((prev) => ({ ...prev, players, status }))
    );
    socket.on("player_disqualified", ({ disqualified }) =>
      setGameState((prev) => ({ ...prev, disqualified }))
    );
    socket.on("game_review", ({ questions }) => setReview(questions));

    socket.on("card_locked", ({ cardIndex, playerName, remainingMs }) => {
      const { quizData: quiz } = latest.current;
      clearTimeout(pickTimer.current);
      setPendingPick(null);
      submittingRef.current = false;
      setIsSubmitting(false);
      setSelectedAnswer(null);
      setConfirmSkip(false);
      setActiveCard({ index: cardIndex, player: playerName });
      setEndsAt(toEndsAt(remainingMs, totalSeconds(quiz)));
    });

    socket.on("answer_result", (data) => {
      const { session: s, quizData: quiz, activeCard: prevCard } = latest.current;
      if (!s) return;
      const me = s.name;
      const cardIndex = data.cardIndex ?? prevCard?.index;
      const answeredBy = data.answeredBy ?? prevCard?.player;
      const iAnswered = answeredBy === me;
      const who = answeredBy || "Your opponent";

      setGameState((prev) => ({
        ...prev,
        scores: data.scores,
        completedCards: data.completedCards,
        cardResults: data.cardResults,
        activityLog: data.activityLog,
      }));
      clearTimeout(pickTimer.current);
      setPendingPick(null);
      resetTurn();

      // Last card answered -> game over
      if (s.total > 0 && (data.completedCards?.length ?? 0) >= s.total) {
        setStep("game-over");
        if (!prefersReducedMotion()) {
          setShowConfetti(true);
          clearTimeout(confettiTimer.current);
          confettiTimer.current = setTimeout(() => setShowConfetti(false), 5000);
        }
        return;
      }

      setStep("playing");

      if (data.isCorrect) {
        showFeedback(
          iAnswered ? "success" : "info",
          iAnswered ? `Correct! +${data.points} points` : `${who} got it right (+${data.points})`
        );
      } else if (data.isStealOpportunity) {
        const stealer = data.stealPlayer;
        const stealPoints = data.stealPoints ?? quiz?.bonusMarks ?? 5;
        // Lock the card for both students while the steal is in progress.
        setActiveCard({ index: cardIndex, player: stealer, isSteal: true });
        setEndsAt(toEndsAt(data.remainingMs, Math.ceil(totalSeconds(quiz) / 2)));

        if (stealer === me) {
          showFeedback("steal", `${who} missed! You can steal for +${stealPoints} points`);
        } else if (iAnswered) {
          showFeedback("error", `Missed! ${stealer} can now steal`);
        } else {
          showFeedback("info", `${who} missed. ${stealer} can steal`);
        }
      } else {
        showFeedback(
          iAnswered ? "error" : "info",
          iAnswered ? "Incorrect. The card is now closed" : `${who} missed. The card is now closed`
        );
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, code, applyGameState, resetTurn, showFeedback]);

  /* ---------------- joining ---------------- */
  const joinGame = useCallback(
    async (rawName) => {
      const name = rawName.trim().replace(/\s+/g, " ");
      if (!code) return setFormError("This link is missing a game code. Ask your teacher for a new link.");
      if (!name) return setFormError("Enter your name to join.");
      if (name.length > MAX_NAME_LENGTH) return setFormError(`Names can be up to ${MAX_NAME_LENGTH} characters.`);
      if (RESERVED_NAMES.includes(name.toLowerCase())) return setFormError("That name isn't available. Pick another one.");

      setFormError("");
      setIsJoining(true);
      try {
        const res = await api.post("/quiz/validate-code", { code });
        const data = res.data.data;
        setQuizData(data);
        setStudentName(name);
        saveName(code, name);
        setSession((prev) =>
          prev && prev.quizId === data.quizId && prev.name === name
            ? prev
            : { quizId: data.quizId, name, total: data.questions?.length ?? 0 }
        );
        setStep("waiting");
      } catch (err) {
        clearSavedName(code);
        setFormError(err.response?.data?.message || "That game code isn't valid. Check the link and try again.");
      } finally {
        setIsJoining(false);
      }
    },
    [code]
  );

  // Refreshing the page re-joins automatically with the saved name.
  useEffect(() => {
    const saved = code ? readSavedName(code) : "";
    if (saved) {
      setStudentName(saved);
      joinGame(saved);
    }
  }, [code, joinGame]);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    joinGame(studentName);
  };

  const leaveAndRetry = () => {
    if (code) clearSavedName(code);
    setSession(null);
    setQuizData(null);
    setGameState(null);
    setFatalError("");
    setReview(null);
    resetTurn();
    setStep("enter-name");
  };

  /* ---------------- playing ---------------- */
  const myName = session?.name ?? studentName;
  const questions = quizData?.questions ?? [];
  const completed = gameState?.completedCards ?? [];
  const cardResults = gameState?.cardResults ?? [];
  const isDisqualified = !!gameState?.disqualified?.includes(myName);
  const isMyTurn = !!activeCard && activeCard.player === myName;

  const lastResultFor = (idx) => {
    const list = cardResults.filter((r) => r.cardIndex === idx);
    return list[list.length - 1];
  };

  const scoreEntries = useMemo(
    () =>
      Object.entries(gameState?.scores || {})
        .filter(([name]) => name.toLowerCase() !== "admin")
        .sort(([, a], [, b]) => b - a),
    [gameState?.scores]
  );

  const handlePickCard = (index) => {
    if (!session || isDisqualified || activeCard || pendingPick !== null) return;
    if (connection !== "connected" || completed.includes(index)) return;
    setPendingPick(index);
    clearTimeout(pickTimer.current);
    pickTimer.current = setTimeout(() => setPendingPick(null), PICK_TIMEOUT_MS);
    socketRef.current?.emit("pick_card", { quizId: session.quizId, cardIndex: index, playerName: session.name });
  };

  const handleSkip = () => {
    if (!confirmSkip) {
      setConfirmSkip(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmSkip(false), 3000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmSkip(false);
    submitAnswer(-1);
  };

  /* ================================================================ */
  /* Render                                                            */
  /* ================================================================ */
  if (fatalError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Can't join this game</h1>
            <p className="mt-2 text-sm text-muted-foreground">{fatalError}</p>
          </div>
          <button
            onClick={leaveAndRetry}
            className="w-full rounded-xl bg-brand py-3 font-bold text-brand-foreground transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (step === "enter-name") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <Trophy className="h-8 w-8 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Join live match</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter your name to join the game.</p>
          </div>
          <form onSubmit={handleJoinSubmit} className="space-y-4" noValidate>
            <div className="relative">
              <label htmlFor="player-name" className="sr-only">Your name</label>
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="player-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                disabled={isJoining}
                aria-invalid={!!formError}
                aria-describedby={formError ? "name-error" : undefined}
                placeholder="Your name (e.g., SS2)"
                className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
              />
            </div>
            {formError && (
              <p id="name-error" role="alert" className="text-sm text-destructive">{formError}</p>
            )}
            <button
              type="submit"
              disabled={isJoining}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-bold text-brand-foreground transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {isJoining ? <><Loader2 className="h-5 w-5 animate-spin" /> Joining…</> : "I'm ready"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "waiting") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <ConnectionBanner connection={connection} />
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 text-center shadow-xl animate-in fade-in zoom-in duration-300">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10">
            <Clock className="h-10 w-10 animate-pulse text-yellow-500" />
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-green-500">
              <Wifi className="h-3 w-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="break-words text-2xl font-bold text-foreground">You're in, {myName}!</h1>
            <p className="mt-2 text-muted-foreground">Waiting for the admin to start the match…</p>
          </div>
          <div className="flex justify-center gap-2" aria-hidden="true">
            {[0, 150, 300].map((d) => (
              <div key={d} className="h-3 w-3 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "game-over") {
    const ranked = scoreEntries.map(([name, score]) => ({
      name,
      score,
      rank: 1 + scoreEntries.filter(([, s]) => s > score).length,
    }));
    const isTie = ranked.length > 1 && ranked[0].score === ranked[1].score;
    const podium = [ranked[1], ranked[0]].filter(Boolean);

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4 md:p-8">
        {showConfetti && <Confetti />}
        <div className="w-full max-w-3xl space-y-8 rounded-3xl border-2 border-brand/30 bg-card p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-500 md:p-12">
          <div className="space-y-3">
            <Award className="mx-auto h-16 w-16 text-brand md:h-20 md:w-20" />
            <h1 className="text-3xl font-bold text-foreground md:text-5xl">Game over</h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              {ranked.length === 0
                ? "The match is complete."
                : isTie
                ? "It's a tie!"
                : `${ranked[0].name} wins!`}
            </p>
          </div>

          {podium.length > 0 && (
            <div className="flex items-end justify-center gap-4 pt-4 md:gap-8">
              {podium.map((entry) => (
                <PodiumSpot key={entry.name} entry={entry} />
              ))}
            </div>
          )}

          <div className="border-t border-border pt-8">
            <p className="mb-3 text-muted-foreground">Final scores</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-lg">
              {ranked.map(({ name, score }) => (
                <div key={name} className="text-center">
                  <p className="max-w-[10rem] truncate font-bold text-foreground">{name}</p>
                  <p className="text-2xl font-bold text-brand">{score} pts</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-8 text-left">
            <h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-bold text-foreground">
              <ListChecks className="h-5 w-5 text-brand" /> Question breakdown
            </h2>
            <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
              {questions.map((q, idx) => {
                const result = lastResultFor(idx);
                const reveal = review?.find((r) => r.cardIndex === idx);
                const tone =
                  result?.result === "correct"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : result?.result === "steal"
                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                    : "bg-destructive/10 text-destructive";
                return (
                  <div key={idx} className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="mb-2 break-words text-sm font-medium text-foreground">
                      Q{idx + 1}. {q.question}
                    </p>
                    {result ? (
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>
                        {result.result === "correct" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {result.result === "steal" && <Zap className="h-3.5 w-3.5" />}
                        {result.result === "wrong" && <XCircle className="h-3.5 w-3.5" />}
                        {result.result === "wrong" ? "No one got it" : `${result.player} got it (+${result.points} pts)`}
                      </div>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">Not played</span>
                    )}
                    {reveal?.correctAnswer && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Answer:</span> {reveal.correctAnswer}
                        {reveal.explanation ? ` — ${reveal.explanation}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // step === "playing"
  const question = isMyTurn ? questions[activeCard.index] : null;

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4 pt-12 md:p-8 md:pt-14">
      <ConnectionBanner connection={connection} />
      <FeedbackToast feedback={feedback} />

      {isMyTurn && question ? (
        <div className="mt-4 w-full max-w-2xl space-y-6 rounded-3xl border-2 border-brand/30 bg-card p-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300 sm:p-8">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {activeCard.isSteal && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1.5 text-sm font-bold text-purple-700 dark:text-purple-400">
                <Zap className="h-4 w-4" /> Steal chance
              </span>
            )}
            {endsAt && (
              <div
                role="timer"
                className={`flex items-center gap-3 rounded-full px-5 py-2.5 font-mono text-2xl font-bold sm:px-6 sm:py-3 sm:text-3xl ${
                  secondsLeft <= 10 ? "animate-pulse bg-destructive/10 text-destructive" : "bg-brand-soft text-brand"
                }`}
              >
                <Clock className="h-6 w-6 sm:h-8 sm:w-8" /> {formatTime(secondsLeft)}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm text-muted-foreground">Card {activeCard.index + 1}</p>
            <h2 className="break-words text-xl font-bold leading-tight text-foreground sm:text-2xl md:text-3xl">
              {question.question}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedAnswer(i)}
                disabled={isSubmitting}
                aria-pressed={selectedAnswer === i}
                className={`break-words rounded-xl border-2 p-4 text-left text-base font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-70 sm:text-lg ${
                  selectedAnswer === i
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-muted text-foreground hover:border-brand/50"
                }`}
              >
                <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex flex-col-reverse items-stretch justify-center gap-3 pt-2 sm:flex-row sm:items-center">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-6 py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50 ${
                confirmSkip
                  ? "border-destructive bg-destructive text-white"
                  : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
              }`}
            >
              <XCircle className="h-5 w-5" /> {confirmSkip ? "Tap again to skip" : "Skip"}
            </button>
            <button
              onClick={() => submitAnswer(selectedAnswer)}
              disabled={selectedAnswer === null || isSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-8 py-3 font-bold text-white transition hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting…</> : <><CheckCircle2 className="h-5 w-5" /> Submit</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl">
          <div className="mb-6 text-center">
            <h1 className="break-words text-2xl font-bold text-foreground sm:text-3xl">{quizData?.title}</h1>
            <p className="mt-2 text-muted-foreground">
              {isDisqualified ? "You've been disqualified from this match." : "Pick an available card to answer."}
            </p>
          </div>

          {isDisqualified && (
            <div role="alert" className="mx-auto mb-6 flex max-w-2xl items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <Ban className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">The admin has disqualified you. You can still watch the scoreboard.</p>
            </div>
          )}

          {activeCard && !isMyTurn && (
            <div className="mx-auto mb-6 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="min-w-0 truncate font-medium text-foreground">
                {activeCard.player} is {activeCard.isSteal ? "stealing" : "answering"} card {activeCard.index + 1}
              </p>
              {endsAt && (
                <span className="font-mono font-bold text-brand" role="timer">{formatTime(secondsLeft)}</span>
              )}
            </div>
          )}

          <div className="mb-10 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">
            {questions.map((_, idx) => {
              const isCompleted = completed.includes(idx);
              const result = lastResultFor(idx);
              const won = result?.result === "correct" || result?.result === "steal";
              const isLocked = activeCard?.index === idx;
              const isMine = isLocked && isMyTurn;
              const isOthers = isLocked && !isMyTurn;
              const isPending = pendingPick === idx;
              const disabled =
                isLocked || isCompleted || pendingPick !== null || isDisqualified || connection !== "connected";

              const stateLabel = isCompleted
                ? won ? "answered correctly" : "closed"
                : isOthers ? `locked by ${activeCard.player}` : "available";

              return (
                <button
                  key={idx}
                  onClick={() => handlePickCard(idx)}
                  disabled={disabled}
                  aria-label={`Card ${idx + 1}, ${stateLabel}`}
                  className={`flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl p-1 text-xl font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:text-2xl ${
                    isCompleted
                      ? won
                        ? "border-2 border-green-500/30 bg-green-500/10 text-green-600"
                        : "border-2 border-destructive/30 bg-destructive/10 text-destructive"
                      : isMine
                      ? "scale-105 bg-brand text-brand-foreground ring-4 ring-brand/30"
                      : isOthers
                      ? "cursor-not-allowed bg-muted text-muted-foreground opacity-60"
                      : "border-2 border-border bg-card text-foreground shadow-sm hover:scale-105 hover:border-brand hover:bg-brand/10 disabled:hover:scale-100 disabled:hover:border-border disabled:hover:bg-card disabled:opacity-60"
                  }`}
                >
                  {isCompleted ? (
                    won ? <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" /> : <XCircle className="h-7 w-7 sm:h-8 sm:w-8" />
                  ) : isLocked ? (
                    isMine ? "You" : (
                      <span className="flex w-full min-w-0 items-center justify-center gap-1 text-xs font-medium sm:text-sm">
                        <Lock className="h-3 w-3 shrink-0" />
                        <span className="truncate">{activeCard.player}</span>
                      </span>
                    )
                  ) : isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    idx + 1
                  )}
                </button>
              );
            })}
          </div>

          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
              <Trophy className="h-5 w-5 text-yellow-500" /> Live scoreboard
            </h2>
            <div className="space-y-2">
              {scoreEntries.map(([name, score], idx) => (
                <div
                  key={name}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                    name === myName ? "border-brand/30 bg-brand/5" : "border-border bg-muted"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
                        idx === 0 ? "bg-yellow-500/20 text-yellow-600" : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate font-semibold text-foreground">
                      {name}{name === myName ? " (you)" : ""}
                    </span>
                  </div>
                  <span className="shrink-0 text-lg font-bold text-brand">{score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
