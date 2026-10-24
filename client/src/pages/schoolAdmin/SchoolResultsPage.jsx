import { useState, useEffect } from "react";
import { ArrowLeft, BarChart3, Users, Calendar, Eye, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function SchoolResultsPage() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSchoolResults = async () => {
      try {
        const response = await api.get("/admin/school-results");
        if (response.data.success) {
          setQuizzes(response.data.data.quizzes);
          setSchoolName(response.data.data.schoolName);
        }
      } catch (err) {
        console.error("Failed to fetch school results:", err);
        setError("Failed to load school-wide quiz data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchoolResults();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm text-muted-foreground">Loading school results…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard" className={`p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${focusRing}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground md:text-3xl">School-Wide Results</h1>
            <p className="text-sm text-muted-foreground">Overview of all quizzes created by teachers at {schoolName}.</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {error ? (
          <div className="p-8 text-center text-destructive">{error}</div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No quizzes found</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Teachers haven't created any quizzes yet, or you don't have any teachers added.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Teacher</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Quiz Title</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Type</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Students</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Date Created</th>
                  <th className="px-4 py-3 text-left font-medium sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quizzes.map((quiz) => (
                  <tr key={quiz._id} className="hover:bg-muted/20 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-foreground sm:px-5">{quiz.teacherName}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-foreground sm:px-5">{quiz.title}</td>
                    <td className="px-4 py-4 sm:px-5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        quiz.gameMode === 'gameShow' 
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" 
                          : "bg-brand-soft text-brand"
                      }`}>
                        {quiz.gameMode === 'gameShow' ? 'Game Show' : 'Quiz'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground sm:px-5">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> {quiz.numberOfStudents}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground sm:px-5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> {quiz.createdAt}
                      </div>
                    </td>
                    <td className="px-4 py-4 sm:px-5">
                      <button 
                        onClick={() => navigate(`/admin/quiz/${quiz._id}/results`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}