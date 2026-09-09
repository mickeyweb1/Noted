import { FileText, Sparkles, Wand2, Loader2, Copy, Check, MessageCircle, Camera } from "lucide-react";
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
      setInputMethod("type"); // Switch to type view so they can edit it
    }
  };

  const handleGenerate = async () => {
    if (!notesText.trim()) return;
    setIsGenerating(true);
    setError("");
    setGeneratedResult(null);

    try {
      const smartTitle = notesText.split("\n")[0].substring(0, 40).trim() || "AI Summary";
      const response = await api.post("/ai/generate", {
        text: notesText,
        mode: "summary",
        title: smartTitle,
        subject: "General",
      });
      setGeneratedResult(response.data.data.generatedText);
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

  return (
    <div className="min-h-screen w-full bg-muted dark:bg-background transition-colors duration-300">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* LEFT COLUMN: INPUT */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
              
              {/* Input Method Tabs */}
              <div className="flex p-1 bg-muted rounded-lg w-fit mx-auto md:mx-0">
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
                <NoteScanner onScanComplete={(text) => { setNotesText(text); setInputMethod("type"); }} />
              )}

              {/* Text Area */}
              {(inputMethod === "type" || inputMethod === "library") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Your Notes</label>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    rows={10}
                    maxLength={50000}
                    placeholder="Paste your messy notes here..."
                    className="flex w-full rounded-lg border border-input bg-background p-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
                  />
                  <div className="flex justify-end text-xs text-muted-foreground">
                    {notesText.length.toLocaleString()} / 50,000
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!notesText.trim() || isGenerating}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-brand text-brand-foreground font-semibold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Summarizing...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate Summary</>
                )}
              </button>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: OUTPUT */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm min-h-[400px] flex flex-col sticky top-6">
              {isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-brand" />
                  <p className="text-sm font-medium">AI is structuring your notes...</p>
                </div>
              ) : generatedResult ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand" /> Clean Summary
                    </h3>
                    <button onClick={handleCopy} className="text-xs text-brand hover:underline flex items-center gap-1 transition-colors">
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  
                  <div className="text-sm leading-relaxed overflow-y-auto max-h-[600px] pr-2 custom-scrollbar markdown-content prose prose-sm dark:prose-invert max-w-none flex-1">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-foreground mt-4 mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-foreground mt-3 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-semibold text-foreground mt-2 mb-1" {...props} />,
                        p: ({node, ...props}) => <p className="text-foreground leading-relaxed mb-3" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 ml-2 mb-3" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 ml-2 mb-3" {...props} />,
                        li: ({node, ...props}) => <li className="text-foreground" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                        code: ({node, inline, ...props}) => inline ? <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props} /> : <code className="block bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto" {...props} />,
                      }}
                    >
                      {generatedResult}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
                  <div className="p-4 rounded-full bg-muted">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-semibold text-foreground">Nothing generated yet</h3>
                    <p className="text-sm mt-1 max-w-[250px] mx-auto">Your clean summary will show up right here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}