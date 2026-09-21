import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, FileText, Plus, Trash2, Sparkles, Loader2, CheckCircle2, Copy, Users, Clock, BarChart3, Image as ImageIcon } from "lucide-react";
import api from "../utils/api";

export default function AdminQuizGenerator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ai"); // 'ai' | 'manual' | 'results'
  
  // Shared Metadata State
  const [metadata, setMetadata] = useState({
    title: "",
    difficulty: "Intermediate",
    numQuestions: 5,
    numStudents: 30,
    timeLimit: 10,
    timeUnit: "minutes", // 'minutes' or 'seconds'
    timeType: "total" // 'total' or 'perQuestion'
  });

  // AI Tab State
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [accessCodes, setAccessCodes] = useState([]);

  // Manual Tab State
  const [manualQuestions, setManualQuestions] = useState([{
    question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", imageUrl: ""
  }]);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);

  // Results State
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [submissions, setSubmissions] = useState([]);

  const handleMetadataChange = (field, value) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  // --- IMAGE UPLOAD HANDLER ---
  const handleImageUpload = async (questionIndex, file) => {
    if (!file) return;
    setUploadingImage(questionIndex);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Upload to your backend (you'll need to create this endpoint)
      const res = await api.post('/upload/quiz-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const updated = [...manualQuestions];
      updated[questionIndex].imageUrl = res.data.imageUrl;
      setManualQuestions(updated);
    } catch (err) {
      alert("Failed to upload image. Make sure backend endpoint exists.");
    } finally {
      setUploadingImage(null);
    }
  };

  // --- AI GENERATION ---
  const handleAIGenerate = async () => {
    if (!notes.trim() || !metadata.title) return alert("Please enter a title and notes.");
    setIsGenerating(true);
    try {
      const res = await api.post("/quiz/generate-ai", {
        ...metadata,
        notes
      });
      setGeneratedQuiz(res.data.data);
      setAccessCodes(res.data.accessCodes);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- MANUAL QUESTIONS ---
  const addManualQuestion = () => {
    setManualQuestions([...manualQuestions, { question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", imageUrl: "" }]);
  };

  const updateManualQuestion = (idx, field, value) => {
    const updated = [...manualQuestions];
    updated[idx][field] = value;
    setManualQuestions(updated);
  };

  const updateOption = (qIdx, optIdx, value) => {
    const updated = [...manualQuestions];
    updated[qIdx].options[optIdx] = value;
    setManualQuestions(updated);
  };

  const handleAutoComplete = async () => {
    const currentCount = manualQuestions.filter(q => q.question.trim()).length;
    const needed = metadata.numQuestions - currentCount;
    if (needed <= 0) return alert("You have already reached the target number of questions.");
    
    setIsAutocompleting(true);
    try {
      const res = await api.post("/quiz/create-manual", {
        ...metadata,
        questions: manualQuestions.filter(q => q.question.trim()),
        useAIAutocomplete: true
      });
      
      setGeneratedQuiz(res.data.data);
      setAccessCodes(res.data.accessCodes);
      setActiveTab("ai");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to auto-complete.");
    } finally {
      setIsAutocompleting(false);
    }
  };

  const handleCreateManualQuiz = async () => {
    if (!metadata.title) return alert("Please enter a quiz title.");
    try {
      const res = await api.post("/quiz/create-manual", {
        ...metadata,
        questions: manualQuestions,
        useAIAutocomplete: false
      });
      setGeneratedQuiz(res.data.data);
      setAccessCodes(res.data.accessCodes);
      setActiveTab("ai");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create quiz.");
    }
  };

  // --- VIEW RESULTS ---
  const fetchResults = async () => {
    if (!selectedQuizId) return;
    try {
      const res = await api.get(`/quiz/${selectedQuizId}/results`);
      setSubmissions(res.data.data);
    } catch (err) {
      alert("Failed to fetch results.");
    }
  };

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Quiz Manager</h1>
          <button onClick={() => navigate("/dashboard")} className="text-sm text-muted-foreground hover:text-foreground">← Back to Dashboard</button>
        </div>

        {/* Tabs */}
        <div className="flex bg-card border border-border rounded-lg p-1 w-fit">
          <button onClick={() => setActiveTab("ai")} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "ai" ? "bg-brand text-brand-foreground" : "text-muted-foreground"}`}>
            <Brain className="w-4 h-4 inline mr-2" /> AI Generate
          </button>
          <button onClick={() => setActiveTab("manual")} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "manual" ? "bg-brand text-brand-foreground" : "text-muted-foreground"}`}>
            <FileText className="w-4 h-4 inline mr-2" /> Manual
          </button>
          <button onClick={() => setActiveTab("results")} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "results" ? "bg-brand text-brand-foreground" : "text-muted-foreground"}`}>
            <BarChart3 className="w-4 h-4 inline mr-2" /> Results
          </button>
        </div>

        {/* Shared Metadata Form */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quiz Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Quiz Title (e.g., Biology Chapter 1)" 
              value={metadata.title} 
              onChange={(e) => handleMetadataChange("title", e.target.value)} 
              className="border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none md:col-span-2" 
            />
            
            <select 
              value={metadata.difficulty} 
              onChange={(e) => handleMetadataChange("difficulty", e.target.value)} 
              className="border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none"
            >
              <option>Basic</option>
              <option>Intermediate</option>
              <option>Hard</option>
              <option>Max</option>
            </select>
            
            {/* Time Limit with Minutes/Seconds Selector */}
            <div className="flex items-center gap-2 border border-border rounded-lg p-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <input 
                type="number" 
                min="1" 
                value={metadata.timeLimit} 
                onChange={(e) => handleMetadataChange("timeLimit", Number(e.target.value))} 
                className="w-16 focus:outline-none" 
              />
              <select 
                value={metadata.timeUnit} 
                onChange={(e) => handleMetadataChange("timeUnit", e.target.value)} 
                className="text-sm text-muted-foreground focus:outline-none"
              >
                <option value="seconds">seconds</option>
                <option value="minutes">minutes</option>
              </select>
              <select 
                value={metadata.timeType} 
                onChange={(e) => handleMetadataChange("timeType", e.target.value)} 
                className="text-sm text-muted-foreground focus:outline-none ml-auto"
              >
                <option value="total">total</option>
                <option value="perQuestion">per question</option>
              </select>
            </div>

            <input 
              type="number" 
              min="1" 
              value={metadata.numQuestions} 
              onChange={(e) => handleMetadataChange("numQuestions", Number(e.target.value))} 
              className="border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" 
              placeholder="Number of Questions" 
            />
            <input 
              type="number" 
              min="1" 
              value={metadata.numStudents} 
              onChange={(e) => handleMetadataChange("numStudents", Number(e.target.value))} 
              className="border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" 
              placeholder="Number of Students (Access Codes)" 
            />
          </div>
        </div>

        {/* AI Tab */}
        {activeTab === "ai" && !generatedQuiz && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand" /> AI Question Generator
            </h2>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={8} 
              placeholder="Paste your notes, textbook text, or lecture summary here. The AI will generate questions based on this content." 
              className="w-full border border-border rounded-lg p-4 focus:ring-2 focus:ring-brand focus:outline-none" 
            />
            <button 
              onClick={handleAIGenerate} 
              disabled={isGenerating} 
              className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold hover:bg-brand/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} 
              Generate Quiz & Codes
            </button>
          </div>
        )}

        {/* Manual Tab */}
        {activeTab === "manual" && !generatedQuiz && (
          <div className="space-y-4">
            {manualQuestions.map((q, idx) => (
              <div key={idx} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-foreground">Question {idx + 1}</h3>
                  {manualQuestions.length > 1 && (
                    <button 
                      onClick={() => setManualQuestions(manualQuestions.filter((_, i) => i !== idx))} 
                      className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Image Upload */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-accent transition">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">Upload Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(idx, e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  {uploadingImage === idx && <Loader2 className="w-4 h-4 animate-spin" />}
                  {q.imageUrl && <span className="text-xs text-green-500">✓ Image attached</span>}
                </div>

                <input 
                  type="text" 
                  placeholder="Question text" 
                  value={q.question} 
                  onChange={(e) => updateManualQuestion(idx, "question", e.target.value)} 
                  className="w-full border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name={`correct-${idx}`} 
                        checked={q.correctAnswer === opt && opt !== ""} 
                        onChange={() => updateManualQuestion(idx, "correctAnswer", opt)} 
                        className="w-4 h-4 text-brand" 
                      />
                      <input 
                        type="text" 
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} 
                        value={opt} 
                        onChange={(e) => updateOption(idx, optIdx, e.target.value)} 
                        className="flex-1 border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none" 
                      />
                    </div>
                  ))}
                </div>
                <input 
                  type="text" 
                  placeholder="Explanation (optional)" 
                  value={q.explanation} 
                  onChange={(e) => updateManualQuestion(idx, "explanation", e.target.value)} 
                  className="w-full border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none" 
                />
              </div>
            ))}
            <div className="flex gap-4">
              <button 
                onClick={addManualQuestion} 
                className="flex-1 py-3 border border-border rounded-xl font-semibold hover:bg-accent transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
              <button 
                onClick={handleAutoComplete} 
                disabled={isAutocompleting} 
                className="flex-1 py-3 bg-electric/10 text-electric border border-electric/20 rounded-xl font-semibold hover:bg-electric/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAutocompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
                AI Auto-Complete & Create
              </button>
            </div>
            <button 
              onClick={handleCreateManualQuiz} 
              className="w-full py-4 bg-brand text-brand-foreground rounded-xl font-bold text-lg hover:bg-brand/90 transition"
            >
              Create Quiz & Generate Codes
            </button>
          </div>
        )}

        {/* Generated Quiz & Codes View */}
        {generatedQuiz && (
          <div className="bg-card border border-green-500/30 bg-green-500/5 rounded-2xl p-6 space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" /> Quiz Created Successfully!
              </h2>
              <button 
                onClick={() => { 
                  setGeneratedQuiz(null); 
                  setAccessCodes([]); 
                  setManualQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", imageUrl: "" }]); 
                  setNotes(""); 
                }} 
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Create Another
              </button>
            </div>
            
            <div className="bg-background rounded-xl p-4 border border-border">
              <h3 className="font-semibold mb-2">Quiz: {generatedQuiz.title}</h3>
              <p className="text-sm text-muted-foreground">
                {generatedQuiz.questions.length} Questions • {metadata.difficulty} • {metadata.timeLimit} {metadata.timeUnit} ({metadata.timeType})
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" /> Student Access Codes ({accessCodes.length})
                </h3>
                <button 
                  onClick={() => navigator.clipboard.writeText(accessCodes.join('\n'))} 
                  className="text-xs flex items-center gap-1 text-brand hover:underline"
                >
                  <Copy className="w-3 h-3" /> Copy All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 bg-background rounded-xl border border-border">
                {accessCodes.map((code, idx) => (
                  <div key={idx} className="text-center font-mono text-sm bg-muted p-2 rounded border border-border">
                    {code}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share these codes with your students. Each code can only be used once.
              </p>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === "results" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">View Quiz Results</h2>
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="Paste Quiz ID to search" 
                value={selectedQuizId} 
                onChange={(e) => setSelectedQuizId(e.target.value)} 
                className="flex-1 border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" 
              />
              <button 
                onClick={fetchResults} 
                className="px-6 py-3 bg-brand text-brand-foreground rounded-lg font-semibold hover:bg-brand/90"
              >
                Fetch Results
              </button>
            </div>
            
            {submissions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Time Taken</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{sub.studentName} {sub.studentSurname}</td>
                        <td className="px-4 py-3">{sub.studentClass || "-"}</td>
                        <td className="px-4 py-3 font-bold text-brand">{sub.score} / {sub.totalQuestions}</td>
                        <td className="px-4 py-3">{Math.floor(sub.timeTaken / 60)}m {sub.timeTaken % 60}s</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}