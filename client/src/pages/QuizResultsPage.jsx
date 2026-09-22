import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar,FileText, ArrowRight , BarChart3, Clock, User, Trophy, ArrowLeft, Download } from "lucide-react";
import api from "../utils/api";


export default function QuizResultsDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get("/quiz/admin/quizzes");
      setQuizzes(res.data.data);
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Quiz Results Dashboard</h1>
        </div>

        {quizzes.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground">No quizzes created yet</h3>
            <p className="text-muted-foreground mt-1">Create a quiz to start seeing student results.</p>
            <button onClick={() => navigate("/admin/quizzes")} className="mt-4 px-4 py-2 bg-brand text-brand-foreground rounded-lg font-medium hover:bg-brand/90">
              Go to Quiz Generator
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <div 
                key={quiz._id}
                onClick={() => navigate(`/admin/quiz/${quiz._id}/results`)}
                className="bg-card border border-border rounded-xl p-6 cursor-pointer hover:border-brand hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-brand/10 rounded-lg text-brand">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{quiz.title}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{quiz.numberOfStudents} Access Codes Generated</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


export default function QuizResultsPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [quizId]);

  const fetchResults = async () => {
    try {
      const res = await api.get(`/quiz/${quizId}/results`);
      setSubmissions(res.data.data);
      // Get quiz info from first submission
      if (res.data.data.length > 0) {
        setQuiz(res.data.data[0].quiz);
      }
    } catch (err) {
      alert("Failed to fetch results.");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Student Name", "Class", "Score", "Total Questions", "Time Taken", "Date Submitted"];
    const rows = submissions.map(sub => [
      `${sub.studentName} ${sub.studentSurname}`,
      sub.studentClass || "-",
      `${sub.score}/${sub.totalQuestions}`,
      sub.totalQuestions,
      `${Math.floor(sub.timeTaken / 60)}m ${sub.timeTaken % 60}s`,
      new Date(sub.submittedAt).toLocaleString()
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quiz?.title || "Quiz"}-Results.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin/quizzes")} className="p-2 hover:bg-accent rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{quiz?.title || "Quiz Results"}</h1>
              <p className="text-muted-foreground">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {submissions.length > 0 && (
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg font-medium hover:bg-brand/90">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-brand" />
              <span className="text-sm text-muted-foreground">Total Students</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{submissions.length}</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-brand" />
              <span className="text-sm text-muted-foreground">Average Score</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {submissions.length > 0 
                ? Math.round(submissions.reduce((acc, sub) => acc + (sub.score / sub.totalQuestions * 100), 0) / submissions.length)
                : 0}%
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-brand" />
              <span className="text-sm text-muted-foreground">Avg. Time</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {submissions.length > 0 
                ? Math.round(submissions.reduce((acc, sub) => acc + sub.timeTaken, 0) / submissions.length / 60)
                : 0}m
            </p>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Student</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Class</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Score</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Percentage</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Time Taken</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submissions.map((sub, idx) => {
                  const percentage = Math.round((sub.score / sub.totalQuestions) * 100);
                  return (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{sub.studentName} {sub.studentSurname}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{sub.studentClass || "-"}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-brand">{sub.score}/{sub.totalQuestions}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          percentage >= 70 ? 'bg-green-500/10 text-green-600' :
                          percentage >= 50 ? 'bg-yellow-500/10 text-yellow-600' :
                          'bg-red-500/10 text-red-600'
                        }`}>
                          {percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {Math.floor(sub.timeTaken / 60)}m {sub.timeTaken % 60}s
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {submissions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No submissions yet. Share the access codes with your students!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}