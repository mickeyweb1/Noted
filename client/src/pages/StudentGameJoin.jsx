import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Gamepad2, ArrowRight, AlertCircle } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StudentGameJoin() {
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = (e) => {
    e.preventDefault();
    if (!gameCode.trim() || !playerName.trim()) {
      return setError("Please enter both a game code and your name.");
    }

    setIsLoading(true);
    setError("");

    try {
      const socket = io(SOCKET_URL, { transports: ["websocket"] });

      socket.on("connect", () => {
        socket.emit("join_game", {
          code: gameCode.trim().toUpperCase(),
          playerName: playerName.trim(),
          role: "student",
        });
      });

      socket.on("game_state", (state) => {
        sessionStorage.setItem("gameSocketId", socket.id);
        sessionStorage.setItem("playerName", playerName.trim());
        sessionStorage.setItem("quizId", state.quizId);
        navigate("/game-play");
      });

      socket.on("error", (msg) => {
        setError(msg);
        socket.disconnect();
        setIsLoading(false);
      });

      socket.on("connect_error", () => {
        setError("Cannot connect to game server. Please try again.");
        socket.disconnect();
        setIsLoading(false);
      });

    } catch (err) {
      setError("Failed to connect to the game server. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand/10 to-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Gamepad2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join Live Game</h1>
          <p className="text-sm text-muted-foreground">Enter the code shown on your teacher's screen.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Game Code</label>
            <input
              type="text"
              value={gameCode}
              onChange={(e) => {
                // ✅ Accept letters AND numbers, remove hyphens/spaces, uppercase
                const cleaned = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 10);
                setGameCode(cleaned);
              }}
              placeholder="e.g., G1A2B3C4"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center text-2xl font-bold tracking-widest text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand"
              maxLength={10}
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
              placeholder="e.g., Alex"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              maxLength={20}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || gameCode.length < 4 || !playerName.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Joining..." : "Join Game"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}