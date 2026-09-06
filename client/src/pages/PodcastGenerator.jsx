import { useState, useEffect, useRef } from "react";
import { Mic, MessageCircle, Sparkles, Loader2, User, GraduationCap, Play, Pause, FileText, Camera } from "lucide-react";
import api from "../utils/api";
import NoteScanner from "../components/NoteScanner";

export default function PodcastGenerator() {
  const [inputMethod, setInputMethod] = useState("type");
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState("short");
  const [script, setScript] = useState([]);
  const [podcastTitle, setPodcastTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Audio states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1); // Highlights the active speaker
  const [voices, setVoices] = useState([]);

  // Library states
  const [libraryNotes, setLibraryNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");

  // Load available browser voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await api.get('/ai/library');
        if (response.data.success) {
          const notes = response.data.data.filter(item => item.type === 'summary' || item.type === 'tutor');
          setLibraryNotes(notes);
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
    const note = libraryNotes.find(n => n._id === noteId);
    if (note) {
      setTopic(note.generatedText || note.title);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setError("");
    setScript([]);
    setPodcastTitle("");
    window.speechSynthesis.cancel(); // Stop any playing audio
    setIsPlaying(false);
    setCurrentLineIndex(-1);

    try {
      const response = await api.post("/ai/generate", {
        text: topic,
        mode: "podcast",
        length: length,
        title: "Study Podcast",
        subject: "General",
      });

      const rawText = response.data.data.generatedText;
      
      try {
        const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.script && Array.isArray(parsed.script)) {
            setScript(parsed.script);
            setPodcastTitle(parsed.title || "Study Podcast");
          } else {
            throw new Error("Invalid script format");
          }
        } else {
          throw new Error("No JSON found");
        }
      } catch (parseError) {
        console.error("Parse error:", parseError);
        setError("The AI generated a response, but it wasn't in the correct script format. Please try again.");
      }

    } catch (err) {
      console.error("Generation failed:", err);
      setError(err.response?.data?.message || "Failed to generate podcast. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ACTUAL AUDIO PLAYER LOGIC
  const toggleAudio = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentLineIndex(-1);
      return;
    }

    if (script.length === 0 || voices.length === 0) return;

    setIsPlaying(true);
    window.speechSynthesis.cancel();

    // Pick two distinct voices for Leo and Dr. Nova
    const leoVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Daniel') || v.name.includes('Microsoft David')) || voices[0];
    const novaVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha') || v.name.includes('Microsoft Zira')) || voices[1] || voices[0];

    let currentIndex = 0;

    const speakNextLine = () => {
      if (currentIndex >= script.length) {
        setIsPlaying(false);
        setCurrentLineIndex(-1);
        return;
      }

      const line = script[currentIndex];
      setCurrentLineIndex(currentIndex);

      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.voice = line.speaker.toLowerCase() === 'leo' ? leoVoice : novaVoice;
      utterance.rate = playbackSpeed; // Applies the speed control
      utterance.pitch = line.speaker.toLowerCase() === 'leo' ? 1.1 : 0.9; // Slight pitch difference

      utterance.onend = () => {
        currentIndex++;
        speakNextLine();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextLine();
  };

  return (
    <div className="min-h-screen w-full bg-muted dark:bg-background transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight flex items-center justify-center gap-3">
            <Mic className="w-8 h-8 text-brand" /> AI Study Podcast
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Turn your notes into a funny, natural conversation with crazy facts and historical myths!
          </p>
        </div>

        {/* Input Section */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex p-1 bg-muted rounded-lg w-fit mx-auto md:mx-0">
            <button onClick={() => { setInputMethod("type"); setTopic(""); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMethod === "type" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <FileText className="w-4 h-4 inline mr-2" /> Type Topic
            </button>
            <button onClick={() => setInputMethod("scan")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMethod === "scan" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <Camera className="w-4 h-4 inline mr-2" /> Scan Notes
            </button>
            <button onClick={() => setInputMethod("library")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMethod === "library" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <MessageCircle className="w-4 h-4 inline mr-2" /> From Library
            </button>
          </div>

          {inputMethod === "scan" && <NoteScanner onScanComplete={(text) => setTopic(text)} />}

          {inputMethod === "library" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select a saved note:</label>
              <select value={selectedNoteId} onChange={handleLibrarySelect} className="flex w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <option value="">-- Choose a note --</option>
                {libraryNotes.map(note => (<option key={note._id} value={note._id}>{note.title} ({new Date(note.createdAt).toLocaleDateString()})</option>))}
              </select>
            </div>
          )}

          {(inputMethod === "type" || inputMethod === "scan" || inputMethod === "library") && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{inputMethod === "type" ? "What topic should they discuss?" : "Review or edit the notes below:"}</label>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={inputMethod === "scan" ? 6 : 4} placeholder="e.g., The Water Cycle, Black Holes..." className="flex w-full rounded-lg border border-input bg-background p-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none" />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Podcast Length:</label>
            <div className="grid grid-cols-3 gap-2">
              {['short', 'medium', 'long'].map((len) => (
                <button key={len} onClick={() => setLength(len)} className={`py-2 rounded-lg text-sm font-medium border transition-all ${length === len ? "bg-brand text-brand-foreground border-brand" : "bg-background text-muted-foreground border-border hover:bg-accent"}`}>
                  {len.charAt(0).toUpperCase() + len.slice(1)} 
                  <span className="block text-[10px] opacity-80">{len === 'short' ? '~3-5 mins' : len === 'medium' ? '~5-8 mins' : '~10-12 mins'}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={!topic.trim() || isLoading} className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-brand text-brand-foreground">
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Writing the script...</> : <><Sparkles className="w-5 h-5" /> Generate Podcast</>}
          </button>
          {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">{error}</div>}
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-brand" />
            <p className="text-sm font-medium">Recording the podcast...</p>
          </div>
        )}

        {!isLoading && script.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Podcast Player Header */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/20 sticky top-4 z-10 backdrop-blur-md">
              <div>
                <h2 className="text-xl font-bold text-foreground">{podcastTitle}</h2>
                <p className="text-xs text-muted-foreground mt-1">Featuring Leo & Dr. Nova</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-background rounded-lg border border-border p-1">
                  {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                    <button key={speed} onClick={() => setPlaybackSpeed(speed)} className={`px-2 py-1 rounded text-xs font-bold transition-all ${playbackSpeed === speed ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {speed}x
                    </button>
                  ))}
                </div>

                <button onClick={toggleAudio} className="p-3 rounded-full bg-brand text-brand-foreground hover:bg-brand/90 transition-all shadow-lg">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Chat Bubbles */}
            <div className="space-y-4 pb-10">
              {script.map((line, index) => {
                const isLeo = line.speaker.toLowerCase() === 'leo';
                const isActive = currentLineIndex === index;
                
                return (
                  <div key={index} className={`flex gap-3 ${isLeo ? 'flex-row' : 'flex-row-reverse'} transition-all duration-300 ${isActive ? 'scale-[1.02]' : 'opacity-80'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isLeo ? 'bg-muted text-muted-foreground' : 'bg-brand/10 text-brand'}`}>
                      {isLeo ? <User className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300 ${
                      isLeo 
                        ? `bg-card border text-foreground rounded-tl-sm ${isActive ? 'border-brand ring-2 ring-brand/20' : 'border-border'}` 
                        : `bg-brand text-brand-foreground rounded-tr-sm ${isActive ? 'ring-4 ring-brand/40 shadow-xl' : ''}`
                    }`}>
                      <p className="font-bold text-xs mb-1 opacity-80">{line.speaker}</p>
                      <p>{line.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}