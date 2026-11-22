import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import api from "../utils/api";

const createPlayerId = () => {
  try {
    return window.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  } catch {
    return `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

export default function StudentGameJoin() {
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (event) => {
    event.preventDefault();

    const code = gameCode.trim().toUpperCase();
    const name = playerName.trim().replace(/\s+/g, " ");

    if (code.length < 4) {
      setError("Enter the game PIN shown on your teacher's screen.");
      return;
    }
    if (!name) {
      setError("Enter your name before joining.");
      return;
    }
    if (name.length > 20) {
      setError("Your name must be 20 characters or fewer.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Validate the PIN through Noted's existing quiz API before opening a socket.
      const response = await api.post("/quiz/validate-code", { code });
      const quiz = response.data?.data;

      if (!quiz?.quizId || quiz.gameMode !== "kahoot") {
        throw new Error("This code is not for a live Noted Quiz Show.");
      }

      const playerId = sessionStorage.getItem("kahoot_playerId") || createPlayerId();
      sessionStorage.setItem("kahoot_code", code);
      sessionStorage.setItem("kahoot_quizId", String(quiz.quizId));
      sessionStorage.setItem("kahoot_title", quiz.title || "Noted Quiz Show");
      sessionStorage.setItem("kahoot_playerId", playerId);
      sessionStorage.setItem("playerName", name);

      navigate("/game-play");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        requestError.message ||
        "We couldn't validate that PIN. Check it and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand/10 to-background p-4">
      <section className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Gamepad2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join Noted Quiz Show</h1>
          <p className="text-sm text-muted-foreground">
            Enter the PIN displayed on your teacher's screen.
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="kahoot-code" className="text-sm font-medium text-foreground">Game PIN</label>
            <input
              id="kahoot-code"
              type="text"
              value={gameCode}
              onChange={(event) => {
                setError("");
                setGameCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12));
              }}
              placeholder="e.g. K-ABC12345"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center text-2xl font-bold tracking-widest text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand"
              maxLength={12}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="kahoot-player-name" className="text-sm font-medium text-foreground">Your name</label>
            <input
              id="kahoot-player-name"
              type="text"
              value={playerName}
              onChange={(event) => {
                setError("");
                setPlayerName(event.target.value.slice(0, 20));
              }}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              maxLength={20}
              autoComplete="name"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || gameCode.trim().length < 4 || !playerName.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Checking PIN...</> : <>Join game<ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </section>
    </main>
  );
}
