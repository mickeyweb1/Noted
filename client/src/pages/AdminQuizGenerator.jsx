import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, FileText, Plus, Trash2, Sparkles, Loader2, CheckCircle2, Copy, Users, Clock, Image as ImageIcon, Upload } from "lucide-react";
import api from "../utils/api";

export default function AdminQuizGenerator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ai"); 
  
  const [metadata, setMetadata] = useState({
    title: "",
    difficulty: "Intermediate",
    numQuestions: 5,
    numStudents: 30,
    timeLimit: 10,
    timeUnit: "minutes",
    timeType: "total"
  });

  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [accessCodes, setAccessCodes] = useState([]);

  const [manualQuestions, setManualQuestions] = useState([{
    question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", imageUrl: ""
  }]);
  
  // ✅ Separated loading states to prevent conflicts
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(null);
  const [isUploadingNotes, setIsUploadingNotes] = useState(false);

  const handleMetadataChange = (field, value) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  // ✅ NEW: Handle File/Image Upload for AI Notes
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Handle Text Files (.txt)
    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNotes((prev) => prev + (prev ? "\n\n--- 📄 File Content ---\n\n" : "") + event.target.result);
      };
      reader.readAsText(file);
    } 
    // 2. Handle Images (JPG, PNG) using your existing Backend OCR
    else if (file.type.startsWith("image/")) {
      setIsUploadingNotes(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Image = event.target.result;
          // Call your existing OCR backend endpoint!
          const res = await api.post("/ai/ocr/extract-text", { imageUrl: base64Image });
          if (res.data.success) {
            setNotes((prev) => prev + (prev ? "\n\n--- 📷 Extracted from Image ---\n\n" : "") + res.data.text);
          }
        } catch (err) {
          alert("Failed to extract text from image. Please try a clearer picture.");
        } finally {
          setIsUploadingNotes(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a .txt file or an image (JPG, PNG).");
    }
    
    // Clear the input so the same file can be selected again
    e.target.value = "";
  };

  const handleImageUpload = async (questionIndex, file) => {
    if (!file) return;
    setUploadingQuestionImage(questionIndex);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/quiz/upload/quiz-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updated = [...manualQuestions];
      updated[questionIndex].imageUrl = res.data.imageUrl;
      setManualQuestions(updated);
    } catch (err) {
      alert("Failed to upload image.");
    } finally {
      setUploadingQuestionImage(null);
    }
  };

  const handleAIGenerate = async () => {
    if (!notes.trim() || !metadata.title) return alert("Please enter a title and notes.");
    setIsGenerating(true);
    try {
      const res = await api.post("/quiz/generate-ai", { ...metadata, notes });
      setGeneratedQuiz(res.data.data);
      setAccessCodes(res.data.accessCodes);
    } catch (err) {
      if (err.response?.status === 401) {
        alert("Your session expired. Please log in again.");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        alert(err.response?.data?.message || "Failed to generate quiz.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

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

  const handleCreateManualQuiz = async () => {
    if (!metadata.title) return alert("Please enter a quiz title.");
    
    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i];
      if (!q.question.trim()) return alert(`Question ${i + 1} is missing text.`);
      if (q.options.some(opt => !opt.trim())) return alert(`Question ${i + 1} is missing one or more options.`);
      if (!q.correctAnswer) return alert(`Please select the correct answer (radio button) for Question ${i + 1}.`);
    }

    setIsGenerating(true);
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
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Quiz Manager</h1>
          <button onClick={() => navigate("/dashboard")} className="text-sm text-muted-foreground hover:text-foreground">← Back to Dashboard</button>
        </div>

        <div className="flex bg-card border border-border rounded-lg p-1 w-fit">
          <button onClick={() => setActiveTab("ai")} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "ai" ? "bg-brand text-brand-foreground" : "text-muted-foreground"}`}>
            <Brain className="w-4 h-4 inline mr-2" /> AI Generate
          </button>
          <button onClick={() => setActiveTab("manual")} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "manual" ? "bg-brand text-brand-foreground" : "text-muted-foreground"}`}>
            <FileText className="w-4 h-4 inline mr-2" /> Manual
          </button>
        </div>

        {/* Shared Metadata Form */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quiz Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Quiz Title" value={metadata.title} onChange={(e) => handleMetadataChange("title", e.target.value)} className="border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none md:col-span-2" />
            <select value={metadata.difficulty} onChange={(e) => handleMetadataChange("difficulty", e.target.value)} className="border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none">
              <option>Basic</option><option>Intermediate</option><option>Hard</option><option>Max</option>
            </select>
            <div className="flex items-center gap-2 border border-border rounded-lg p-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <input type="number" min="1" value={metadata.timeLimit} onChange={(e) => handleMetadataChange("timeLimit", Number(e.target.value))} className="w-16 focus:outline-none" />
              <select value={metadata.timeUnit} onChange={(e) => handleMetadataChange("timeUnit", e.target.value)} className="text-sm text-muted-foreground focus:outline-none">
                <option value="seconds">seconds</option><option value="minutes">minutes</option>
              </select>
              <select value={metadata.timeType} onChange={(e) => handleMetadataChange("timeType", e.target.value)} className="text-sm text-muted-foreground focus:outline-none ml-auto">
                <option value="total">total</option><option value="perQuestion">per question</option>
              </select>
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Number of Questions</label>
              <input type="number" min="1" value={metadata.numQuestions} onChange={(e) => handleMetadataChange("numQuestions", Number(e.target.value))} className="w-full border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" placeholder="e.g., 5" />
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Number of Students (Access Codes)</label>
              <input type="number" min="1" value={metadata.numStudents} onChange={(e) => handleMetadataChange("numStudents", Number(e.target.value))} className="w-full border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" placeholder="e.g., 30" />
            </div>
          </div>
        </div>

        {/* ✅ UPDATED AI Tab with File Upload */}
        {activeTab === "ai" && !generatedQuiz && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand" /> AI Question Generator
            </h2>
            
            {/* File Upload Dropzone */}
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-accent/50 transition-colors">
              <input 
                type="file" 
                accept=".txt, image/png, image/jpeg, image/jpg" 
                onChange={handleFileUpload}
                disabled={isUploadingNotes}
                className="hidden" 
                id="quiz-file-upload" 
              />
              <label htmlFor="quiz-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                {isUploadingNotes ? (
                  <>
                    <Loader2 className="w-8 h-8 text-brand animate-spin" />
                    <span className="text-sm font-medium text-foreground">Extracting text from image...</span>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-brand/10 rounded-full text-brand">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Click to upload e-notes (.txt or Image)</span>
                    <span className="text-xs text-muted-foreground">The AI will automatically read the text from your file</span>
                  </>
                )}
              </label>
            </div>

            <div className="relative">
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows={8} 
                placeholder="Or paste your notes, textbook text, or lecture summary here..." 
                className="w-full border border-border rounded-lg p-4 focus:ring-2 focus:ring-brand focus:outline-none" 
              />
              {notes && (
                <button 
                  onClick={() => setNotes("")} 
                  className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded bg-background border border-border"
                >
                  Clear
                </button>
              )}
            </div>

            <button 
              onClick={handleAIGenerate} 
              disabled={isGenerating || !notes.trim()} 
              className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold hover:bg-brand/90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <button onClick={() => setManualQuestions(manualQuestions.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-accent transition">
                    <ImageIcon className="w-4 h-4" /><span className="text-sm">Upload Image</span>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(idx, e.target.files[0])} className="hidden" />
                  </label>
                  {uploadingQuestionImage === idx && <Loader2 className="w-4 h-4 animate-spin" />}
                  {q.imageUrl && <span className="text-xs text-green-500">✓ Image attached</span>}
                </div>
                <input type="text" placeholder="Question text" value={q.question} onChange={(e) => updateManualQuestion(idx, "question", e.target.value)} className="w-full border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand focus:outline-none" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${idx}`} checked={q.correctAnswer === opt && opt !== ""} onChange={() => updateManualQuestion(idx, "correctAnswer", opt)} className="w-4 h-4 text-brand" />
                      <input type="text" placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} value={opt} onChange={(e) => updateOption(idx, optIdx, e.target.value)} className="flex-1 border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
                    </div>
                  ))}
                </div>
                <input type="text" placeholder="Explanation (optional)" value={q.explanation} onChange={(e) => updateManualQuestion(idx, "explanation", e.target.value)} className="w-full border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
              </div>
            ))}
            <div className="flex gap-4">
              <button onClick={addManualQuestion} className="flex-1 py-3 border border-border rounded-xl font-semibold hover:bg-accent transition flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Question</button>
            </div>
            <button onClick={handleCreateManualQuiz} disabled={isGenerating} className="w-full py-4 bg-brand text-brand-foreground rounded-xl font-bold text-lg hover:bg-brand/90 transition disabled:opacity-50">
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> : null}
              Create Quiz & Generate Codes
            </button>
          </div>
        )}

        {/* Generated Quiz & Codes View */}
        {generatedQuiz && (
          <div className="bg-card border border-green-500/30 bg-green-500/5 rounded-2xl p-6 space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><CheckCircle2 className="w-6 h-6 text-green-600" /> Quiz Created Successfully!</h2>
              <button onClick={() => { setGeneratedQuiz(null); setAccessCodes([]); setManualQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", imageUrl: "" }]); setNotes(""); }} className="text-sm text-muted-foreground hover:text-foreground">Create Another</button>
            </div>
            <div className="bg-background rounded-xl p-4 border border-border">
              <h3 className="font-semibold mb-2">Quiz: {generatedQuiz.title}</h3>
              <p className="text-sm text-muted-foreground">{generatedQuiz.questions.length} Questions • {metadata.difficulty} • {metadata.timeLimit} {metadata.timeUnit} ({metadata.timeType})</p>
            </div>
            <button onClick={() => navigate(`/admin/quiz-results`)} className="w-full flex items-center justify-center gap-2 py-3 bg-brand/10 text-brand border border-brand/20 rounded-xl font-semibold hover:bg-brand/20 transition">
              View All Quiz Results Dashboard
            </button>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Student Access Codes ({accessCodes.length})</h3>
                <button onClick={() => navigator.clipboard.writeText(accessCodes.join('\n'))} className="text-xs flex items-center gap-1 text-brand hover:underline"><Copy className="w-3 h-3" /> Copy All</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 bg-background rounded-xl border border-border">
                {accessCodes.map((code, idx) => (<div key={idx} className="text-center font-mono text-sm bg-muted p-2 rounded border border-border">{code}</div>))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Share these codes with your students. Each code can only be used once.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
