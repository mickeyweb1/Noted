import { useState, useRef, useEffect } from "react";
import { Music, Mic, Loader2, Sparkles, Volume2, Play, Pause, Square, FileText, Camera, MessageCircle, Wand2 } from "lucide-react";
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
  
  const { isPlaying: isBeatPlaying, currentBeat, playBeat, pauseBeat, resumeBeat, stopBeat, setVolume: setGlobalVolume } = useMusic();
  const [localVolume, setLocalVolume] = useState(0.4);

  const [libraryNotes, setLibraryNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const vocalsRef = useRef(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await api.get("/ai/library");
        if (response.data.success) {
          setLibraryNotes(response.data.data.filter(item => item.type === "summary" || item.type === "tutor"));
        }
      } catch (err) { console.error("Failed to fetch library:", err); }
    };
    fetchLibrary();
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (vocalsRef.current) vocalsRef.current.volume = localVolume;
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

  const handleAutoSelectVibe = async () => {
    if (!notes.trim()) return alert("Please enter some notes first so the AI can analyze them!");
    
    setIsGeneratingLyrics(true);
    try {
      const analysisPrompt = `Analyze these study notes and recommend the BEST music vibe for studying this content.

Choose ONE vibe from these options:
- Afrobeat Rap
- Chill Lo-Fi
- Upbeat Pop
- Epic Orchestral

Notes: ${notes.substring(0, 800)}

Answer in this exact format:
VIBE: [exact vibe name from the list above]
WHY: [one short sentence]`;

      const response = await api.post("/ai/generate", {
        text: analysisPrompt,
        mode: "summary",
        title: "Music Analysis",
        max_tokens: 150
      });

      // ✅ SAFE EXTRACTION: Handle different backend response structures
      const generatedText = response.data?.data?.generatedText || response.data?.generatedText;
      if (!generatedText) {
        throw new Error("AI returned empty content");
      }

      console.log("🎵 AI Response:", generatedText);
      
      let detectedVibe = "";
      let reason = "Based on your notes";
      
      const vibeMatch = generatedText.match(/^VIBE:\s*(.+)$/im);
      if (vibeMatch) {
        const rawVibe = vibeMatch[1].trim();
        detectedVibe = VIBES.find(v => v.toLowerCase() === rawVibe.toLowerCase()) || "";
      }
      
      const reasonMatch = generatedText.match(/WHY:\s*(.+?)(?:\n|$)/i);
      if (reasonMatch) reason = reasonMatch[1].trim();
      
      if (!detectedVibe) {
        console.warn("⚠️ No valid vibe detected from AI, using fallback logic");
        const notesLower = notes.toLowerCase();
        if (notesLower.includes("history") || notesLower.includes("war") || notesLower.includes("battle") || notesLower.includes("important")) {
          detectedVibe = "Epic Orchestral";
          reason = "Historical/important content benefits from dramatic music";
        } else if (notesLower.includes("science") || notesLower.includes("math") || notesLower.includes("formula") || notesLower.includes("calculate")) {
          detectedVibe = "Chill Lo-Fi";
          reason = "Technical content requires focused, calm music";
        } else if (notesLower.includes("motivational") || notesLower.includes("energy") || notesLower.includes("active")) {
          detectedVibe = "Afrobeat Rap";
          reason = "Energetic content matches rhythmic beats";
        } else {
          detectedVibe = "Chill Lo-Fi";
          reason = "General study content works best with calm music";
        }
      }
      
      if (detectedVibe === "Afrobeat Rap") setSelectedBeatId("beat_3");
      else if (detectedVibe === "Chill Lo-Fi") setSelectedBeatId("beat_2");
      else if (detectedVibe === "Upbeat Pop") setSelectedBeatId("beat_1");
      else setSelectedBeatId("beat_1");
      
      setSelectedVibe(detectedVibe);
      
      alert(`🎵 AI Analysis Complete!\n\nSelected: ${detectedVibe}\nReason: ${reason}\n\nI've automatically selected the best vibe and beat for you!`);
      
    } catch (error) {
      console.error("Auto-select failed:", error);
      // ✅ Show the exact error to help us debug
      const errorMsg = error.response?.data?.message || error.message || "Unknown error";
      alert(`AI couldn't analyze the vibe.\n\nError: ${errorMsg}\n\nPlease select manually.`);
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleGenerateLyrics = async () => {
    if (!notes.trim()) return alert("Please enter or scan some notes first!");
    stopPlayback();
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    setUseBrowserTTS(false);
    setLyrics("");
    setIsGeneratingLyrics(true);
    try {
      const response = await api.post("/ai/generate", { text: notes, mode: "music", vibe: selectedVibe, title: "AI Study Track" });
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
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(res.data));
      setUseBrowserTTS(false);
    } catch (error) {
      console.warn("ElevenLabs failed, falling back to browser TTS", error);
      setUseBrowserTTS(true);
      setAudioUrl(null);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const pausePlayback = () => {
    if (vocalsRef.current) vocalsRef.current.pause();
    window.speechSynthesis.pause();
    pauseBeat();
    setIsPlaying(false);
  };

  const stopPlayback = () => {
    if (vocalsRef.current) { vocalsRef.current.pause(); vocalsRef.current.currentTime = 0; }
    stopBeat();
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const handlePlayFullTrack = async () => {
    if (isPlaying) { pausePlayback(); return; }

    const beat = FREE_BEATS.find(b => b.id === selectedBeatId);
    if (beat) await playBeat(beat);

    if (useBrowserTTS) {
      window.speechSynthesis.cancel();
      const cleanLyrics = lyrics.replace(/\[.*?\]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanLyrics);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en-US') || v.name.includes('Google US English'));
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.1;
      utterance.volume = localVolume;
      utterance.onend = () => stopPlayback();
      window.speechSynthesis.speak(utterance); 
      setIsPlaying(true);
    } else if (vocalsRef.current) {
      vocalsRef.current.volume = localVolume;
      vocalsRef.current.onended = () => stopPlayback();
      try {
        await vocalsRef.current.play(); 
        setIsPlaying(true);
      } catch (error) {
        console.error("Vocal playback blocked by browser:", error);
        stopBeat();
        setUseBrowserTTS(true);
        setIsPlaying(false);
      }
    }
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

          {inputMethod === "scan" && (
            <NoteScanner onScanComplete={(text) => { setNotes(prev => prev ? `${prev}\n\n--- 📄 New Page ---\n\n${text}` : text); setInputMethod("type"); }} />
          )}

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

          <button onClick={handleAutoSelectVibe} disabled={isGeneratingLyrics || !notes.trim()} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <Wand2 className="w-5 h-5" /> ✨ AI Auto-Select Best Vibe & Beat
          </button>

          <button onClick={handleGenerateLyrics} disabled={isGeneratingLyrics || !notes.trim()} className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-bold hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isGeneratingLyrics ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGeneratingLyrics ? "Writing Lyrics..." : "Generate Lyrics"}
          </button>
        </div>

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
              
              <div className="flex gap-3">
                <button onClick={isPlaying ? pausePlayback : handlePlayFullTrack} className="flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-purple-600 text-white hover:bg-purple-700">
                  {isPlaying ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> Play Full Track</>}
                </button>
                {isPlaying && (
                  <button onClick={stopPlayback} className="px-4 py-3 rounded-xl font-bold transition-all bg-red-500 text-white hover:bg-red-600">
                    <Square className="w-5 h-5" fill="currentColor" />
                  </button>
                )}
              </div>

              {audioUrl && <audio ref={vocalsRef} src={audioUrl} className="hidden" />}

              <div className="space-y-3 pt-3 border-t border-purple-500/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Background Beat</p>
                  <select value={selectedBeatId} onChange={(e) => { setSelectedBeatId(e.target.value); if (isPlaying) stopPlayback(); }} className="text-xs bg-card border border-border rounded px-2 py-1">
                    {FREE_BEATS.map(beat => (<option key={beat.id} value={beat.id}>{beat.name}</option>))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input type="range" min="0" max="1" step="0.05" value={localVolume} onChange={(e) => setLocalVolume(Number(e.target.value))} className="w-full accent-purple-600" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
