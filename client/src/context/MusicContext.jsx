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

  useEffect(() => {
    if (currentBeat && audioRef.current) {
      audioRef.current.src = currentBeat.url;
      audioRef.current.loop = true;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Beat play error:", err));
      }
    }
  }, [currentBeat]);

  const play = () => {
    if (audioRef.current && currentBeat) {
      audioRef.current.play().catch(err => console.error("Beat play error:", err));
      setIsPlaying(true);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggle = () => {
    if (isPlaying) pause();
    else play();
  };

  return (
    <MusicContext.Provider value={{ isPlaying, currentBeat, volume, setVolume, setCurrentBeat, play, pause, toggle }}>
      {children}
      {/* Global hidden audio element that never unmounts */}
      <audio ref={audioRef} className="hidden" crossOrigin="anonymous" preload="auto" />
    </MusicContext.Provider>
  );
};