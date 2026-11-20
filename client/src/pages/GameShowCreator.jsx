import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Loader2, AlertCircle, Plus } from "lucide-react";
import api from "../utils/api";

export default function GameShowCreator() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await api.get("/admin/quizzes");
        if (res.data.success) {
          setQuizzes(res.data.data || []);
        }
      } catch (err) {
        setError("Failed to load quizzes.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Game Show Creator</h1>
            <p className="text-muted-foreground">Select a quiz to start a live, interactive game show.</p>
          </div>
          <button
            onClick={() => navigate("/admin/quizzes")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" /> Create New Quiz
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {quizzes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No quizzes yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create a quiz first, then come back to host a live game.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz._id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-brand/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-foreground">{quiz.title}</h3>
                    {quiz.gameMode === "gameShow" && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                        Game Show
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {quiz.questions?.length || 0} questions • {quiz.numberOfStudents || 0} max students
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/game-host/${quiz._id}`)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-green-500"
                >
                  <Trophy className="h-4 w-4" /> Start Live Game
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}