import { useState, useRef, useEffect } from "react";
import { Music, Mic, Loader2, Sparkles, Volume2, Play, Pause, FileText, Camera, MessageCircle } from "lucide-react";
import api from "../utils/api";
import NoteScanner from "../components/NoteScanner";
import { useMusic } from "../context/MusicContext";

const FREE_BEATS = [
  { id: "beat_1", name: "Upbeat Hip-Hop Loop", url: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3" },
  { id: "beat_2", name: "Chill Lo-Fi Study", url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { id: "beat_3", name: "Afrobeat Groove", url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3" } 
];

const VIBES = ["Afrobeat Rap", "Chill Lo-Fi", "Upbeat Pop", "Epic Orchestral"];

export default function MusicGenerator() {
  const [inputMethod, setInputMethod] = useState("type");
  const [notes, setNotes] = useState("");
  const [selectedBeatId, setSelectedBeatId] = useState("beat_1");
  const [selectedVibe, setSelectedVibe] = useState("Afrobeat Rap");
  const [lyrics, setLyrics] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useBrowserTTS, setUseBrowserTTS] = useState(false);
  
  // ✅ Use global music context
  const { isPlaying: isBeatPlaying, currentBeat, setCurrentBeat, toggle: toggleBeat, setVolume: setGlobalVolume } = useMusic();
  const [localVolume, setLocalVolume] = useState(0.4);

  const [libraryNotes, setLibraryNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");

  const vocalsRef = useRef(null);

  // ✅ Clean up audio URLs to prevent memory leaks
  useEffect(() => {
    window.speechSynthesis.getVoices();
    const fetchLibrary = async () => {
      try {
        const response = await api.get("/ai/library");
        if (response.data.success) {
          setLibraryNotes(response.data.data.filter(item => item.type === "summary" || item.type === "tutor"));
        }
      } catch (err) { console.error("Failed to fetch library:", err); }
    };
    fetchLibrary();
    
    return () => {
      // ✅ Clean up audio URL on unmount
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // ✅ Sync volume with global context
  useEffect(() => {
    setGlobalVolume(localVolume);
  }, [localVolume, setGlobalVolume]);

  const handleLibrarySelect = (e) => {
    const noteId = e.target.value;
    setSelectedNoteId(noteId);
    const note = libraryNotes.find((item) => item._id === noteId);
    if (note) {
      setNotes(note.generatedText || note.title);
      setInputMethod("type");
    }
  };

  const handleGenerateLyrics = async () => {
    if (!notes.trim()) return alert("Please enter or scan some notes first!");
    setIsGeneratingLyrics(true);
    try {
      const response = await api.post("/ai/generate", {
        text: notes,
        mode: "music",
        vibe: selectedVibe,
        title: "AI Study Track"
      });
      if (response.data.success) setLyrics(response.data.data.generatedText);
    } catch (error) {
      alert("Failed to generate lyrics. Please try again.");
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleGenerateVocals = async () => {
    if (!lyrics.trim()) return alert("Generate lyrics first!");
    stopPlayback();
    setIsGeneratingAudio(true);
    try {
      const res = await api.post("/ai/text-to-speech", { text: lyrics, style: "rap" }, { responseType: 'blob' });
      
      // ✅ Clean up old URL before creating new one
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      const url = URL.createObjectURL(res.data);
      setAudioUrl(url);
      setUseBrowserTTS(false);
    } catch (error) {
      console.warn("ElevenLabs failed, falling back to browser TTS", error);
      setUseBrowserTTS(true);
      setAudioUrl(null);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const stopPlayback = () => {
    if (vocalsRef.current) { 
      vocalsRef.current.pause(); 
      vocalsRef.current.currentTime = 0; 
    }
    // ✅ Stop global beat instead of local
    if (isBeatPlaying) {
      toggleBeat();
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const handlePlayFullTrack = async () => {
    if (isPlaying) { 
      stopPlayback(); 
      return; 
    }

    // ✅ Set global beat based on selection
    const beat = FREE_BEATS.find(b => b.id === selectedBeatId);
    if (beat) {
      setCurrentBeat(beat);
      if (!isBeatPlaying) {
        toggleBeat(); // Start the beat
      }
    }

    // Play vocals
    if (useBrowserTTS) {
      window.speechSynthesis.cancel();
      const cleanLyrics = lyrics.replace(/\[.*?\]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanLyrics);
      const voices = window.speechSynthesis.getVoices();
      const rapVoice = voices.find(v => v.lang.includes('en-NG') || v.lang.includes('en-US') || v.name.includes('Google US English'));
      if (rapVoice) utterance.voice = rapVoice;
      utterance.rate = 1.15;
      utterance.onend = () => {
        stopPlayback();
        if (isBeatPlaying) toggleBeat(); // Stop beat when vocals end
      };
      window.speechSynthesis.speak(utterance);
    } else if (vocalsRef.current) {
      vocalsRef.current.onended = () => {
        stopPlayback();
        if (isBeatPlaying) toggleBeat(); // Stop beat when vocals end
      };
      vocalsRef.current.play().catch(console.error);
    }
    
    setIsPlaying(true);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
          <Music className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">AI Music Studio</h1>
          <p className="text-sm text-muted-foreground">Turn your notes into a hard-hitting study song!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: INPUT */}
        <div className="space-y-4">
          <div className="flex p-1 bg-muted rounded-lg w-fit">
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

          {inputMethod === "library" && (
            <select value={selectedNoteId} onChange={handleLibrarySelect} className="flex w-full rounded-lg border border-input bg-background p-3 text-sm">
              <option value="">Choose a saved note...</option>
              {libraryNotes.map((note) => (<option key={note._id} value={note._id}>{note.title}</option>))}
            </select>
          )}

          {inputMethod === "scan" && <NoteScanner 
  onScanComplete={(text) => { 
    // ✅ Appends new scan to existing notes with a page break
    setNotesText(prev => prev ? prev + "\n\n--- 📄 New Page ---\n\n" + text : text); 
    setInputMethod("type"); 
  }} 
/>}

          {(inputMethod === "type" || inputMethod === "library") && (
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} placeholder="Paste your notes here..." className="w-full rounded-xl border border-border bg-card p-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
          )}
          
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Music Vibe / Genre</span>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((vibe) => (
                <button key={vibe} type="button" onClick={() => setSelectedVibe(vibe)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${selectedVibe === vibe ? "border-purple-500 bg-purple-500 text-white" : "border-border bg-background text-muted-foreground hover:bg-accent"}`}>
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerateLyrics} disabled={isGeneratingLyrics || !notes.trim()} className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-bold hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isGeneratingLyrics ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGeneratingLyrics ? "Writing Lyrics..." : "Generate Lyrics"}
          </button>
        </div>

        {/* RIGHT: OUTPUT */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground">Generated Lyrics</label>
          <div className="w-full h-64 rounded-xl border border-border bg-card p-4 text-sm overflow-y-auto whitespace-pre-wrap font-mono">
            {lyrics || "Your lyrics will appear here..."}
          </div>
          <button onClick={handleGenerateVocals} disabled={isGeneratingAudio || !lyrics.trim()} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isGeneratingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            {isGeneratingAudio ? "Recording Vocals..." : "Generate Vocals"}
          </button>

          {(audioUrl || useBrowserTTS) && (
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 mt-6">
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-500" /> Your Track is Ready!
              </h3>
              <button onClick={handlePlayFullTrack} className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isPlaying ? "bg-red-500 text-white hover:bg-red-600" : "bg-purple-600 text-white hover:bg-purple-700"}`}>
                {isPlaying ? <><Pause className="w-5 h-5" /> Pause Track</> : <><Play className="w-5 h-5" /> Play Full Track</>}
              </button>

              {audioUrl && <audio ref={vocalsRef} src={audioUrl} className="hidden" />}

              <div className="space-y-3 pt-3 border-t border-purple-500/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Background Beat</p>
                  <select 
                    value={selectedBeatId} 
                    onChange={(e) => { 
                      setSelectedBeatId(e.target.value); 
                      const beat = FREE_BEATS.find(b => b.id === e.target.value);
                      setCurrentBeat(beat);
                      if (isPlaying) stopPlayback(); 
                    }} 
                    className="text-xs bg-card border border-border rounded px-2 py-1"
                  >
                    {FREE_BEATS.map(beat => (<option key={beat.id} value={beat.id}>{beat.name}</option>))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={localVolume} 
                    onChange={(e) => setLocalVolume(Number(e.target.value))} 
                    className="w-full accent-purple-600" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}