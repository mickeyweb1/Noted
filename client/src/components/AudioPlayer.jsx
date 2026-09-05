import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Volume2, Loader2 } from "lucide-react";
import api from "../utils/api";

export default function AudioPlayer({ text, title }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const handlePlayPause = async () => {
    if (isPlaying) {
      // Pause logic
      if (useFallback) {
        window.speechSynthesis.pause();
      } else {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      // Play logic
      setIsLoading(true);
      
      if (useFallback) {
        // BROWSER NATIVE FALLBACK
        window.speechSynthesis.cancel(); // Stop any previous speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        setIsLoading(false);
      } else {
        // ELEVENLABS API CALL
        try {
          const response = await api.post('/ai/text-to-speech', { text }, { responseType: 'blob' });
          
          const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
            setIsPlaying(true);
          }
        } catch (error) {
          // ✅ BULLETPROOF FALLBACK TRIGGER
          console.warn("ElevenLabs failed, switching to browser voice...", error);
          setUseFallback(true);
          // Automatically retry with browser voice
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.onend = () => setIsPlaying(false);
          window.speechSynthesis.speak(utterance);
          setIsPlaying(true);
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
        
        {/* Hidden HTML5 Audio Element for ElevenLabs */}
        <audio 
          ref={audioRef} 
          onEnded={() => setIsPlaying(false)} 
          onError={() => { setUseFallback(true); handlePlayPause(); }} 
          className="hidden" 
        />
      </div>
    </div>
  );
}