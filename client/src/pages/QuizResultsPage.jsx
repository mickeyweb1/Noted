import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, FileText, ArrowRight, BarChart3, Clock, User, Users, Trophy, ArrowLeft, Download, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import api from "../utils/api";

export function QuizResultsDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchQuizzes(); }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get("/quiz/admin/quizzes");
      setQuizzes(res.data.data);
    } catch (err) { console.error("Failed to fetch quizzes:", err); } 
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>;

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
            <button onClick={() => navigate("/admin/quizzes")} className="mt-4 px-4 py-2 bg-brand text-brand-foreground rounded-lg font-medium hover:bg-brand/90">Go to Quiz Generator</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <div key={quiz._id} onClick={() => navigate(`/admin/quiz/${quiz._id}/results`)} className="bg-card border border-border rounded-xl p-6 cursor-pointer hover:border-brand hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-brand/10 rounded-lg text-brand"><BarChart3 className="w-6 h-6" /></div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{quiz.title}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{new Date(quiz.createdAt).toLocaleDateString()}</span></div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span>{quiz.numberOfStudents} Access Codes Generated</span></div>
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
  const [quizData, setQuizData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { fetchResults(); }, [quizId]);

  const fetchResults = async () => {
    try {
      const res = await api.get(`/quiz/${quizId}/results`);
      setQuizData(res.data.data.quiz);
      setSubmissions(res.data.data.submissions);
    } catch (err) { alert("Failed to fetch results."); } 
    finally { setLoading(false); }
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    try {
      const res = await api.post(`/quiz/${quizId}/regenerate-code`);
      alert(`New code generated: ${res.data.newCode}\n\nPlease copy this and give it to the student.`);
      fetchResults(); // Refresh to update the code count
    } catch (err) {
      alert("Failed to regenerate code.");
    } finally {
      setRegenerating(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Student Name", "Class", "Score", "Percentage", "Time Taken", "Tab Switches", "Date Submitted"];
    const rows = submissions.map(sub => [
      `${sub.studentName} ${sub.studentSurname}`, sub.studentClass || "-",
      `${sub.score}/${sub.totalQuestions}`, `${Math.round((sub.score / sub.totalQuestions) * 100)}%`,
      `${Math.floor(sub.timeTaken / 60)}m ${sub.timeTaken % 60}s`, sub.tabSwitchCount || 0,
      new Date(sub.submittedAt).toLocaleString()
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quizData?.title || "Quiz"}-Results.csv`;
    a.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>;

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin/quiz-results")} className="p-2 hover:bg-accent rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{quizData?.title || "Quiz Results"}</h1>
              <p className="text-muted-foreground">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRegenerateCode} disabled={regenerating} className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-lg font-medium hover:bg-accent transition disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} /> Regenerate Code
            </button>
            {submissions.length > 0 && (
              <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg font-medium hover:bg-brand/90 transition">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2"><User className="w-5 h-5 text-brand" /><span className="text-sm text-muted-foreground">Total Students</span></div>
            <p className="text-3xl font-bold text-foreground">{submissions.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2"><Trophy className="w-5 h-5 text-brand" /><span className="text-sm text-muted-foreground">Average Score</span></div>
            <p className="text-3xl font-bold text-foreground">{submissions.length > 0 ? Math.round(submissions.reduce((acc, sub) => acc + (sub.score / sub.totalQuestions * 100), 0) / submissions.length) : 0}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2"><Clock className="w-5 h-5 text-brand" /><span className="text-sm text-muted-foreground">Avg. Time</span></div>
            <p className="text-3xl font-bold text-foreground">{submissions.length > 0 ? Math.round(submissions.reduce((acc, sub) => acc + sub.timeTaken, 0) / submissions.length / 60) : 0}m</p>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Student</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Score</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Percentage</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Tab Switches</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submissions.map((sub, idx) => {
                  const percentage = Math.round((sub.score / sub.totalQuestions) * 100);
                  const isExpanded = expandedSubmission === sub._id;
                  return (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{sub.studentName} {sub.studentSurname}</div>
                          <div className="text-xs text-muted-foreground">{sub.studentClass || "No class"}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-brand">{sub.score}/{sub.totalQuestions}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${percentage >= 70 ? 'bg-green-500/10 text-green-600' : percentage >= 50 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'}`}>
                            {percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">{Math.floor(sub.timeTaken / 60)}m {sub.timeTaken % 60}s</td>
                        <td className="px-6 py-4">
                          {sub.tabSwitchCount > 0 ? (
                            <span className="text-red-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {sub.tabSwitchCount}</span>
                          ) : (
                            <span className="text-green-600 text-sm">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => setExpandedSubmission(isExpanded ? null : sub._id)} className="text-sm text-brand hover:underline flex items-center gap-1">
                            {isExpanded ? 'Hide Details' : 'View Answers'} {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                      {/* ✅ EXPANDABLE ROW: Shows exactly what the student got right/wrong */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" className="bg-muted/30 p-6">
                            <div className="space-y-4">
                              <h4 className="font-semibold text-foreground mb-2">Question Breakdown</h4>
                              {sub.answers.map((ans, aIdx) => {
                                const question = quizData?.questions.find(q => q._id === ans.questionId);
                                if (!question) return null;
                                return (
                                  <div key={aIdx} className="bg-card border border-border rounded-xl p-4">
                                    <p className="font-medium text-foreground mb-3">{aIdx + 1}. {question.question}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                      <div className={`p-3 rounded-lg border ${ans.isCorrect ? 'bg-green-500/10 border-green-500/30 text-green-700' : 'bg-red-500/10 border-red-500/30 text-red-700'}`}>
                                        <span className="font-semibold block mb-1">Student Answer:</span>
                                        {ans.selectedAnswer || "Skipped"} {ans.isCorrect ? <CheckCircle2 className="w-4 h-4 inline ml-1" /> : <XCircle className="w-4 h-4 inline ml-1" />}
                                      </div>
                                      {!ans.isCorrect && (
                                        <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/30 text-green-700">
                                          <span className="font-semibold block mb-1">Correct Answer:</span>
                                          {question.correctAnswer} <CheckCircle2 className="w-4 h-4 inline ml-1" />
                                        </div>
                                      )}
                                    </div>
                                    {question.explanation && (
                                      <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm text-blue-700">
                                        <span className="font-semibold">Explanation:</span> {question.explanation}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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