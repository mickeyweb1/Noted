import { createContext, useContext, useState, useRef, useEffect } from "react";

const MusicContext = createContext();

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic must be used within a MusicProvider");
  return context;
};

export const MusicProvider = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(null); 
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playBeat = async (beat) => {
    if (!audioRef.current || !beat?.url) return false;
    const audio = audioRef.current;
    audio.pause();
    audio.src = beat.url;
    audio.loop = true;
    audio.load();
    try {
      await audio.play();
      setCurrentBeat(beat);
      setIsPlaying(true);
      return true;
    } catch (error) {
      console.error("Beat play error:", error);
      setIsPlaying(false);
      return false;
    }
  };

  const pauseBeat = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resumeBeat = async () => {
    if (audioRef.current && currentBeat) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Beat resume error:", error);
        setIsPlaying(false);
      }
    }
  };

  const stopBeat = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <MusicContext.Provider value={{ 
      isPlaying, 
      currentBeat, 
      volume, 
      setVolume, 
      setCurrentBeat, 
      playBeat, 
      pauseBeat, 
      resumeBeat, 
      stopBeat 
    }}>
      {children}
      {/* Removed crossOrigin to prevent CDN loading issues */}
      <audio ref={audioRef} className="hidden" preload="auto" />
    </MusicContext.Provider>
  );
};