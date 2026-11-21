import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Users, Play, AlertCircle, Monitor, Loader2, SkipForward } from "lucide-react";
import api from "../utils/api";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function TeacherGameHost() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [error, setError] = useState("");
  const [quizData, setQuizData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        // Fetch the quiz details using the results endpoint which accepts the ID
        const res = await api.get(`/quiz/${quizId}/results`);
        if (res.data.success) {
          setQuizData(res.data.data.quiz);
        } else {
          setError("Quiz not found or you don't have access.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load quiz data. Ensure the backend is running.");
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId) fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (!quizId || !quizData) return;

    const newSocket = io(SOCKET_URL, { transports: ["websocket"] });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      const token = localStorage.getItem("token");
      newSocket.emit("join_game", { quizId, role: "admin", token });
    });

    newSocket.on("player_joined", ({ players: updatedPlayers, status }) => {
      setPlayers(updatedPlayers.filter(p => p.name !== "Admin"));
      setGameStatus(status);
    });

    newSocket.on("game_started", () => {
      setGameStatus("live");
    });

    newSocket.on("error", (msg) => setError(msg));

    return () => { newSocket.disconnect(); };
  }, [quizId, quizData]);

  // Auto-start logic
  useEffect(() => {
    if (quizData?.autoStart && gameStatus === "waiting" && players.length > 0 && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const timer = setTimeout(() => {
        socket.emit("admin_start_game", { quizId });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [quizData, gameStatus, players.length, socket, quizId]);

  const handleStartGame = () => {
    if (players.length === 0) {
      alert("Wait for at least one student to join!");
      return;
    }
    socket.emit("admin_start_game", { quizId });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-brand" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
        <AlertCircle className="mx-auto mb-3 h-10 w-10" />
        <h2 className="text-xl font-bold">Error</h2>
        <p className="mt-2">{error}</p>
        <button onClick={() => navigate("/admin/kahoot")} className="mt-4 rounded-lg bg-destructive px-4 py-2 text-white">Go Back</button>
      </div>
    </div>
  );

  const gameCode = quizData?.accessCodes?.[0]?.code || quizData?.accessCodes?.[0] || "LOADING";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <Monitor className="mx-auto h-12 w-12 text-brand" />
          <h1 className="text-4xl font-bold">{quizData?.title || "Live Kahoot"}</h1>
          <p className="text-slate-400">Have students join at <span className="font-bold text-white">usenotedai.com/game-join</span></p>
        </div>

        <div className="rounded-3xl border-4 border-brand bg-brand/10 p-10 text-center shadow-2xl shadow-brand/20">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand mb-4">Enter this code to join</p>
          <h2 className="text-7xl md:text-8xl font-black tracking-widest text-white">{gameCode}</h2>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <Users className="h-5 w-5 text-brand" /> Players Joined ({players.length})
            </h3>
            
            {gameStatus === "waiting" && players.length > 0 && (
              quizData?.autoStart ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-yellow-500/20 px-6 py-3 font-bold text-yellow-400 animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin" /> Starting automatically...
                </span>
              ) : (
                <button onClick={handleStartGame} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-green-500 active:scale-95">
                  <Play className="h-5 w-5 fill-current" /> Start Game
                </button>
              )
            )}
            
            {gameStatus === "live" && (
              <span className="rounded-full bg-green-500/20 px-4 py-1.5 text-sm font-bold text-green-400 animate-pulse">
                ● Game is Live
              </span>
            )}
          </div>

          {players.length === 0 ? (
            <div className="py-12 text-center text-slate-500"><p>Waiting for students to join...</p></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {players.map((player, idx) => (
                <div key={player.id || idx} className="rounded-xl bg-slate-800 p-3 text-center font-semibold text-white shadow-sm animate-in fade-in zoom-in duration-300">
                  {player.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}