import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Volume2, Loader2 } from "lucide-react";
import api from "../utils/api";

// ✅ FIX: Added 'style' prop, defaulting to "podcast"
export default function AudioPlayer({ text, title, style = "podcast" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const playFallback = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      if (useFallback) {
        window.speechSynthesis.pause();
      } else {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      
      if (useFallback) {
        playFallback();
        setIsLoading(false);
      } else {
        try {
          // ✅ FIX: Pass the 'style' prop to the backend so it knows to strip [Intro] tags for music
          const response = await api.post('/ai/text-to-speech', { text, style }, { responseType: 'blob' });
          const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            await audioRef.current.play();
            setIsPlaying(true);
          }
        } catch (error) {
          console.warn("ElevenLabs failed, switching to browser voice...", error);
          setUseFallback(true);
          playFallback();
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleStop = () => {
    if (useFallback) {
      window.speechSynthesis.cancel();
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-brand/5 to-electric/5 border border-brand/20 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-brand/10 text-brand">
          <Volume2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Listen to this Note</p>
          <p className="text-xs text-muted-foreground">
            {useFallback ? "Using Browser Voice" : "AI Premium Voice"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-brand text-brand-foreground hover:bg-brand/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" fill="currentColor" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
          )}
        </button>
        
        {isPlaying && (
          <button
            onClick={handleStop}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <Square className="w-4 h-4" fill="currentColor" />
          </button>
        )}
        
        <audio 
          ref={audioRef} 
          onEnded={() => setIsPlaying(false)} 
          onError={() => { 
            setIsPlaying(false); 
            setUseFallback(true); 
            setTimeout(playFallback, 50); 
          }} 
          className="hidden" 
        />
      </div>
    </div>
  );
}