import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, FileText, Plus, Trash2, Loader2, CheckCircle2, ArrowLeft, Zap, Users, Hash } from "lucide-react";
import api from "../utils/api";
import useMyLimits from "../hooks/useMyLimits";

const TABS = [
  { id: "manual", label: "Manual", Icon: FileText },
  { id: "ai", label: "AI Generate", Icon: Sparkles },
];

// The classic Kahoot colors and shapes
const KAHOOT_COLORS = [
  { bg: "bg-red-500", shape: "▲" },
  { bg: "bg-blue-500", shape: "◆" },
  { bg: "bg-yellow-500", shape: "●" },
  { bg: "bg-green-500", shape: "■" },
];

export default function KahootCreator() {
  const navigate = useNavigate();
  const { limits } = useMyLimits();
  
  const [activeTab, setActiveTab] = useState("manual");
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(20); 
  const [numQuestions, setNumQuestions] = useState("10"); // ✅ NEW: For AI
  const [numStudents, setNumStudents] = useState("30");   // ✅ NEW: For Codes
  
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  
  const [questions, setQuestions] = useState([
    { type: "quiz", text: "", options: ["", "", "", ""], correctIndex: null }
  ]);

  const maxQ = limits?.maxQuestionsPerQuiz || 50;
  const maxS = limits?.maxStudents || 500;

  const addQuestion = () => {
    if (questions.length >= maxQ) return setError(`Your plan allows a maximum of ${maxQ} questions.`);
    setQuestions([...questions, { type: "quiz", text: "", options: ["", "", "", ""], correctIndex: null }]);
  };

  const removeQuestion = (idx) => setQuestions(questions.filter((_, i) => i !== idx));

  const updateQuestion = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;
    // Auto-adjust options when switching between Quiz and True/False
    if (field === "type" && value === "truefalse") {
      updated[idx].options = ["True", "False"];
      updated[idx].correctIndex = null;
    } else if (field === "type" && value === "quiz") {
      updated[idx].options = ["", "", "", ""];
      updated[idx].correctIndex = null;
    }
    setQuestions(updated);
  };

  const updateOption = (qIdx, oIdx, value) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = value;
    setQuestions(updated);
  };

  const handleAIGenerate = async () => {
    if (!notes.trim()) return setError("Please enter some notes for the AI.");
    setIsGenerating(true);
    setError("");
    try {
      const res = await api.post("/quiz/generate-ai-preview", {
        notes,
        difficulty: "Intermediate",
        numQuestions: Number(numQuestions) || 10, // ✅ Sends the requested number
      });
      
      const aiQuestions = res.data?.data?.questions || [];
      if (aiQuestions.length === 0) return setError("AI couldn't generate questions. Try different notes.");

      // Map AI questions to our Kahoot format, stripping any "a) " or "b) " prefixes the AI might add
      const mapped = aiQuestions.map(q => {
        const cleanOptions = q.options.map(opt => opt.replace(/^[a-dA-D]\)\s*/i, "").trim());
        const correctIdx = cleanOptions.indexOf(q.correctAnswer.replace(/^[a-dA-D]\)\s*/i, "").trim());
        return {
          type: "quiz",
          text: q.question,
          options: cleanOptions.length === 4 ? cleanOptions : ["", "", "", ""],
          correctIndex: correctIdx >= 0 ? correctIdx : null
        };
      });
      
      setQuestions(mapped);
      setActiveTab("manual"); // Switch to manual tab so they can review/edit
    } catch (err) {
      setError(err.response?.data?.message || "AI generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateKahoot = async () => {
    if (!title.trim()) return setError("Please enter a Kahoot title.");
    const validQuestions = questions.filter(q => q.text.trim() && q.correctIndex !== null);
    if (validQuestions.length === 0) return setError("Please add at least one complete question with a correct answer.");

    setIsGenerating(true);
    setError("");

    try {
      const payloadQuestions = validQuestions.map(q => ({
        question: q.text,
        options: q.options.filter(o => o && o.trim() !== ""),
        correctAnswer: q.options[q.correctIndex],
        explanation: "",
        topic: "",
        imageUrl: ""
      }));

      const res = await api.post("/quiz/create-manual", {
        title: title.trim(),
        difficulty: "Intermediate",
        numStudents: Number(numStudents) || 30, // ✅ Sends number of students for codes
        timeLimit: timeLimit,
        timeUnit: "seconds",
        timeType: "perQuestion",
        gameMode: "kahoot", 
        layoutMode: "kahoot",
        showAnswersAfterSubmission: true,
        passMark: 50,
        questions: payloadQuestions,
      });

      // 🚀 Instantly launch the Live Game Host screen!
      navigate(`/game-host/${res.data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create Kahoot.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin/dashboard")} className="p-2 rounded-lg hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
                <Zap className="h-8 w-8 text-yellow-500 fill-yellow-500" /> Kahoot Creator
              </h1>
              <p className="text-muted-foreground">Build a fast-paced, live classroom game.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          {/* ✅ NEW: Settings Grid with Questions and Students */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm font-bold text-foreground mb-1 block">Kahoot Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Math Battle!" 
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1 block flex items-center gap-1">
                <Hash className="h-4 w-4" /> Num. Questions (AI)
              </label>
              <input 
                type="number" 
                value={numQuestions} 
                onChange={(e) => setNumQuestions(e.target.value)}
                min="1"
                max={maxQ}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1 block flex items-center gap-1">
                <Users className="h-4 w-4" /> Num. Students
              </label>
              <input 
                type="number" 
                value={numStudents} 
                onChange={(e) => setNumStudents(e.target.value)}
                min="1"
                max={maxS}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-1 block">Time per Question (Seconds)</label>
            <input 
              type="number" 
              value={timeLimit} 
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-full md:w-1/3 rounded-xl border border-input bg-background px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex gap-2 border-b border-border pb-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                  activeTab === tab.id ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <tab.Icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "ai" && (
            <div className="space-y-4 py-4">
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste your notes, textbook text, or topics here. The AI will generate questions for you to review."
                className="w-full rounded-xl border border-input bg-background p-4 min-h-[150px] focus:ring-2 focus:ring-brand"
              />
              <button 
                onClick={handleAIGenerate}
                disabled={isGenerating || !notes.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-foreground shadow-sm transition hover:bg-brand/90 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Generate {numQuestions} Questions with AI
              </button>
            </div>
          )}

          {activeTab === "manual" && (
            <div className="space-y-6 py-4">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="rounded-2xl border-2 border-border bg-background p-6 space-y-4 shadow-sm hover:border-brand/30 transition">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">Question {qIdx + 1}</h3>
                    <button onClick={() => removeQuestion(qIdx)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex gap-4">
                    <select 
                      value={q.type} 
                      onChange={(e) => updateQuestion(qIdx, "type", e.target.value)}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-brand"
                    >
                      <option value="quiz">Quiz (4 Options)</option>
                      <option value="truefalse">True / False</option>
                    </select>
                  </div>

                  <textarea 
                    value={q.text}
                    onChange={(e) => updateQuestion(qIdx, "text", e.target.value)}
                    placeholder="Type your question here... (Use $...$ for math)"
                    className="w-full rounded-xl border border-input bg-background p-4 text-lg font-medium focus:ring-2 focus:ring-brand"
                    rows={2}
                  />

                  <div className={`grid gap-3 ${q.type === 'truefalse' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {q.options.map((opt, oIdx) => (
                      <div 
                        key={oIdx} 
                        onClick={() => updateQuestion(qIdx, "correctIndex", oIdx)}
                        className={`flex items-center gap-3 rounded-xl p-4 cursor-pointer transition-all border-2 ${
                          q.correctIndex === oIdx 
                            ? 'border-green-500 bg-green-500/10 ring-2 ring-green-500/50 shadow-md' 
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white text-xl font-bold ${KAHOOT_COLORS[oIdx].bg}`}>
                          {KAHOOT_COLORS[oIdx].shape}
                        </div>
                        <input 
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={`Option ${oIdx + 1}`}
                          className="flex-1 bg-transparent text-foreground font-medium focus:outline-none"
                          readOnly={q.type === 'truefalse'}
                        />
                        {q.correctIndex === oIdx && <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Click an option box to mark it as the correct answer.</p>
                </div>
              ))}

              <button 
                onClick={addQuestion}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 font-bold text-muted-foreground hover:border-brand hover:text-brand transition"
              >
                <Plus className="h-5 w-5" /> Add Question
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={handleCreateKahoot}
          disabled={isGenerating}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-4 text-xl font-black text-white shadow-lg transition hover:bg-green-500 active:scale-[0.99] disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Zap className="h-6 w-6 fill-current" />}
          Create Kahoot & Start Live Game
        </button>
      </div>
    </div>
  );
}