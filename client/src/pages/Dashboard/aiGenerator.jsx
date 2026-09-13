import { FileText, Sparkles, Wand2, Loader2, Copy, Check, MessageCircle, Camera, Trash2, Download } from "lucide-react";
import { useState, useEffect } from "react";
import api from "../../utils/api";
import NoteScanner from "../../components/NoteScanner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function StudentAiGenerator() {
  const [inputMethod, setInputMethod] = useState("type");
  const [notesText, setNotesText] = useState("");
  const [generatedResult, setGeneratedResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Library state
  const [libraryNotes, setLibraryNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await api.get("/ai/library");
        if (response.data.success) {
          setLibraryNotes(response.data.data.filter(item => item.type === "summary" || item.type === "tutor"));
        }
      } catch (err) {
        console.error("Failed to fetch library:", err);
      }
    };
    fetchLibrary();
  }, []);

  const handleLibrarySelect = (e) => {
    const noteId = e.target.value;
    setSelectedNoteId(noteId);
    const note = libraryNotes.find((item) => item._id === noteId);
    if (note) {
      setNotesText(note.generatedText || note.title);
      setInputMethod("type");
    }
  };

  const handleGenerate = async () => {
    if (!notesText.trim()) return;
    setIsGenerating(true);
    setError("");
    setGeneratedResult(null);
    setCopied(false);

    try {
      const smartTitle = notesText.split("\n")[0].substring(0, 40).trim() || "AI Summary";
      const response = await api.post("/ai/generate", {
        text: notesText,
        mode: "summary",
        title: smartTitle,
        subject: "General",
      });
      setGeneratedResult(response.data.data.generatedText);
      
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById('generated-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err.response?.data?.message || "Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedResult) {
      navigator.clipboard.writeText(generatedResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!generatedResult) return;
    const blob = new Blob([generatedResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Noted-Summary-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setNotesText("");
    setGeneratedResult(null);
    setSelectedNoteId("");
    setError("");
  };

  const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;
  const charCount = notesText.length;

  return (
    <div className="min-h-screen w-full bg-muted dark:bg-background transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 text-brand text-sm font-semibold border border-brand/20">
            <Sparkles className="w-4 h-4" /> AI Note Summarizer
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
            Turn messy notes into clean summaries
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Paste your notes, scan a photo, or pick from your library. We'll structure it perfectly for studying.
          </p>
        </div>

        {/* MAIN INPUT SECTION */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
          
          {/* Input Method Tabs */}
          <div className="flex p-1 bg-muted rounded-lg w-fit mx-auto">
            <button onClick={() => setInputMethod("type")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMethod === "type" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <FileText className="w-4 h-4 inline mr-2" /> Type
            </button>
            <button onClick={() => setInputMethod("scan")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMethod === "scan" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <Camera className="w-4 h-4 inline mr-2" /> Scan
            </button>
            <button onClick={() => setInputMethod("library")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMethod === "library" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <MessageCircle className="w-4 h-4 inline mr-2" /> Library
            </button>
          </div>

          {/* Library Dropdown */}
          {inputMethod === "library" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select a saved note</label>
              <select value={selectedNoteId} onChange={handleLibrarySelect} className="flex w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                <option value="">Choose a note...</option>
                {libraryNotes.map((note) => (
                  <option key={note._id} value={note._id}>{note.title} ({new Date(note.createdAt).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
          )}

          {/* Scanner */}
          {inputMethod === "scan" && (
            <NoteScanner 
              onScanComplete={(text) => { 
                setNotesText(prev => prev ? prev + "\n\n---  New Page ---\n\n" + text : text); 
                setInputMethod("type"); 
              }} 
            />
          )}

          {/* Text Area */}
          {(inputMethod === "type" || inputMethod === "library") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Your Notes</label>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{wordCount.toLocaleString()} words</span>
                  <span>{charCount.toLocaleString()} chars</span>
                  {notesText && (
                    <button onClick={handleClear} className="text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={12}
                maxLength={50000}
                placeholder="Paste your messy notes here..."
                className="flex w-full rounded-lg border border-input bg-background p-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none font-mono leading-relaxed"
              />
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${charCount > 45000 ? 'bg-red-500' : 'bg-brand'}`}
                  style={{ width: `${Math.min((charCount / 50000) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!notesText.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-brand text-brand-foreground font-semibold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl"
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Summarizing...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Generate Summary</>
            )}
          </button>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </div>

        {/* GENERATED RESULTS SECTION - Now directly below input */}
        <div id="generated-results" className={`transition-all duration-500 ${generatedResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {generatedResult && (
            <div className="p-6 rounded-2xl bg-card border-2 border-brand/30 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-brand/10">
                    <Sparkles className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground text-lg">Clean Summary</h3>
                    <p className="text-xs text-muted-foreground">AI-generated study notes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Download as text file">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors text-sm font-medium">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              
              <div className="text-sm leading-relaxed markdown-content prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-foreground mt-5 mb-3" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-foreground mt-4 mb-2" {...props} />,
                    p: ({node, ...props}) => <p className="text-foreground leading-relaxed mb-4" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 ml-4 mb-4" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-2 ml-4 mb-4" {...props} />,
                    li: ({node, ...props}) => <li className="text-foreground" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                    code: ({node, inline, ...props}) => inline ? <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-brand" {...props} /> : <code className="block bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto my-3" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-brand pl-4 italic text-muted-foreground my-4" {...props} />,
                  }}
                >
                  {generatedResult}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}