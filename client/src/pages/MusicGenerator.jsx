import { useState, useRef, useEffect } from "react";
import { Music, Mic, Loader2, Sparkles, Volume2, Play, Pause } from "lucide-react";
import api from "../utils/api";
import NoteScanner from "../components/NoteScanner";

// ✅ FIX #18: Removed the "Reliable Test Track" debug leftover
const FREE_BEATS = [
  { id: "beat_1", name: "Upbeat Hip-Hop Loop", url: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3" },
  { id: "beat_2", name: "Chill Lo-Fi Study", url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { id: "beat_3", name: "Afrobeat Groove", url: "https://cdn.pixabay.com/download/audio/2022/03/24/audio_07b2a04be3.mp3" } // Replaced with a real Pixabay track
];

const VIBES = ["Afrobeat Rap", "Chill Lo-Fi", "Upbeat Pop", "Epic Orchestral"];

export default function MusicGenerator() {
  const [notes, setNotes] = useState("");
  const [selectedBeatId, setSelectedBeatId] = useState("beat_1");
  const [selectedVibe, setSelectedVibe] = useState("Afrobeat Rap"); // Default value
  const [lyrics, setLyrics] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatVolume, setBeatVolume] = useState(0.4);
  const [useBrowserTTS, setUseBrowserTTS] = useState(false);

  const vocalsRef = useRef(null);
  const beatRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  const handleGenerateLyrics = async () => {
    if (!notes.trim()) return alert("Please enter or scan some notes first!");
    setIsGeneratingLyrics(true);
    try {
      // ✅ FIX: Changed 'res' to 'response' to match the variable name
      const response = await api.post("/ai/generate", {
        text: notes,
        mode: "music",
        vibe: selectedVibe, // ✅ FIX #19: Sends the user's actual choice!
        title: "AI Study Track"
      });
      
      if (response.data.success) {
        setLyrics(response.data.data.generatedText);
      }
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
      const res = await api.post("/ai/text-to-speech", {
        text: lyrics,
        style: "rap"
      }, { responseType: 'blob' });
      
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
    clearInterval(fadeIntervalRef.current);
    if (vocalsRef.current) {
      vocalsRef.current.pause();
      vocalsRef.current.currentTime = 0;
    }
    if (beatRef.current) {
      beatRef.current.pause();
      beatRef.current.currentTime = 0;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const handlePlayFullTrack = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    const beat = beatRef.current;
    if (beat) {
      beat.currentTime = 0;
      beat.loop = true;
      beat.volume = beatVolume;
      beat.play().catch(err => console.error("Beat play error:", err));
    }

    if (useBrowserTTS) {
      window.speechSynthesis.cancel();
      const cleanLyrics = lyrics.replace(/\[.*?\]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanLyrics);
      const voices = window.speechSynthesis.getVoices();
      const rapVoice = voices.find(v => v.lang.includes('en-NG') || v.lang.includes('en-US') || v.name.includes('Google US English'));
      if (rapVoice) utterance.voice = rapVoice;
      utterance.rate = 1.15;
      utterance.onend = () => stopPlayback();
      window.speechSynthesis.speak(utterance);
    } else if (vocalsRef.current) {
      vocalsRef.current.play().catch(err => console.error("Vocals play error:", err));
    }

    setIsPlaying(true);
  };

  const handleBeatVolumeChange = (e) => {
    const v = Number(e.target.value);
    setBeatVolume(v);
    if (beatRef.current) beatRef.current.volume = v;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
          <Music className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">AI Music Studio</h1>
          <p className="text-sm text-muted-foreground">Turn your notes into a hard-hitting study song!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground">Your Notes</label>
          
          <NoteScanner onScanComplete={(text) => setNotes(text)} />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your notes here, or use the scanner above to snap a photo..."
            className="w-full h-48 rounded-xl border border-border bg-card p-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
          
          {/* ✅ FIX: Added UI so the user can actually change the vibe! */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Music Vibe / Genre</span>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((vibe) => (
                <button 
                  key={vibe} 
                  type="button" 
                  onClick={() => setSelectedVibe(vibe)} 
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedVibe === vibe 
                      ? "border-purple-500 bg-purple-500 text-white" 
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateLyrics}
            disabled={isGeneratingLyrics || !notes.trim()}
            className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-bold hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGeneratingLyrics ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGeneratingLyrics ? "Writing Lyrics..." : "Generate Lyrics"}
          </button>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground">Generated Lyrics</label>
          <div className="w-full h-48 rounded-xl border border-border bg-card p-4 text-sm overflow-y-auto whitespace-pre-wrap font-mono">
            {lyrics || "Your lyrics will appear here..."}
          </div>
          <button
            onClick={handleGenerateVocals}
            disabled={isGeneratingAudio || !lyrics.trim()}
            className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGeneratingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            {isGeneratingAudio ? "Recording Vocals..." : "Generate Vocals"}
          </button>
        </div>
      </div>

      {(audioUrl || useBrowserTTS) && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-500" /> Your Track is Ready!
          </h3>

          <button
            onClick={handlePlayFullTrack}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg ${
              isPlaying ? "bg-red-500 text-white hover:bg-red-600" : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {isPlaying ? <><Pause className="w-6 h-6" /> Pause Track</> : <><Play className="w-6 h-6" /> Play Full Track (Vocals + Beat)</>}
          </button>

          {audioUrl && <audio ref={vocalsRef} src={audioUrl} className="hidden" />}
          
          <div className="space-y-2 pt-4 border-t border-purple-500/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Background Beat Selection</p>
              <select 
                value={selectedBeatId} 
                onChange={(e) => {
                  setSelectedBeatId(e.target.value);
                  if (isPlaying) stopPlayback();
                }}
                className="text-xs bg-card border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {FREE_BEATS.map(beat => (
                  <option key={beat.id} value={beat.id}>{beat.name}</option>
                ))}
              </select>
            </div>
            
            <audio 
              ref={beatRef} 
              src={FREE_BEATS.find(b => b.id === selectedBeatId)?.url} 
              className="hidden"
              crossOrigin="anonymous"
              preload="auto"
            />

            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <label className="text-xs text-muted-foreground shrink-0">Beat volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={beatVolume}
                onChange={handleBeatVolumeChange}
                className="w-full accent-purple-600"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}