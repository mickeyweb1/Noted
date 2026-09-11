import { useState, useEffect, useRef } from "react";
import { 
    Play, Pause, RotateCcw, SkipForward, 
    Coffee, Brain, Moon, CloudRain, Music, Volume2,
    CheckCircle2, Target, Award
} from "lucide-react";
import api from "../../utils/api";
import { useMusic } from "../../context/MusicContext"; // ✅ ADD THIS

const BEATS = [
  { id: "beat_1", name: "Upbeat Hip-Hop", url: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3" },
  { id: "beat_2", name: "Chill Lo-Fi", url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { id: "beat_3", name: "Afrobeat Groove", url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3" }
];

export default function FocusTime() {
    const [isRunning, setIsRunning] = useState(false);
    const [activeMode, setActiveMode] = useState("focus");
    const [activeSound, setActiveSound] = useState("rain");
    const [showSuccess, setShowSuccess] = useState(false);
    
    // ✅ Global Music State
    const { 
  isPlaying: isBeatPlaying, 
  currentBeat, 
  playBeat, 
  pauseBeat 
} = useMusic();
    const [localVolume, setLocalVolume] = useState(0.4);

    useEffect(() => {
        setGlobalVolume(localVolume);
    }, [localVolume, setGlobalVolume]);

// Replace the getTimeForMode function and initial state with this:

const getTimeForMode = (mode) => {
    // ✅ Read from localStorage, fallback to defaults if not set
    const savedFocus = Number(localStorage.getItem("focusTime")) || 25;
    const savedShort = Number(localStorage.getItem("shortBreak")) || 5;
    const savedLong = Number(localStorage.getItem("longBreak")) || 15;

    if (mode === "focus") return savedFocus * 60;
    if (mode === "shortBreak") return savedShort * 60;
    if (mode === "longBreak") return savedLong * 60;
    return savedFocus * 60;
};

// Update the initial state to use the saved focus time
const [timeLeft, setTimeLeft] = useState(getTimeForMode("focus"));
    const timerRef = useRef(null);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        } else if (timeLeft === 0 && isRunning) {
            setIsRunning(false);
            clearInterval(timerRef.current);
            if (activeMode === "focus") handleFocusComplete();
            else alert("Break is over! Ready to get back to work?");
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning, timeLeft, activeMode]);

    const handleFocusComplete = async () => {
        try {
            let durationMinutes = activeMode === "shortBreak" ? 5 : activeMode === "longBreak" ? 15 : 25;
            const response = await api.post('/ai/focus-complete', { durationMinutes }); 
            if (response.data.success) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 5000); 
                const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
                userInfo.xp = response.data.data.xp;
                userInfo.level = response.data.data.level;
                localStorage.setItem("userInfo", JSON.stringify(userInfo));
            }
        } catch (error) {
            console.error("Failed to award XP:", error);
        }
    };

    const handleModeChange = (mode) => {
        setActiveMode(mode);
        setIsRunning(false);
        setTimeLeft(getTimeForMode(mode));
    };

    const handleReset = () => {
        setIsRunning(false);
        setTimeLeft(getTimeForMode(activeMode));
    };

    const modes = [
        { id: "focus", label: "Focus", icon: Brain, time: "25m" },
        { id: "shortBreak", label: "Short Break", icon: Coffee, time: "5m" },
        { id: "longBreak", label: "Long Break", icon: Moon, time: "15m" },
    ];

    const sounds = [
        { id: "rain", label: "Rain", icon: CloudRain },
        { id: "lofi", label: "Lo-Fi", icon: Music },
        { id: "none", label: "Silence", icon: CheckCircle2 },
    ];

    return (
        <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300 relative">
            {showSuccess && (
                <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
                    <Award className="w-6 h-6" />
                    <div>
                        <p className="font-bold">Focus Session Complete!</p>
                        <p className="text-sm">+15 XP Awarded 🎉</p>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Focus Time</h1>
                        <p className="text-muted-foreground mt-1">Lock in, block out distractions, and get things done.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex gap-2 p-1.5 bg-card rounded-xl border border-border shadow-sm w-fit">
                            {modes.map((mode) => (
                                <button key={mode.id} onClick={() => handleModeChange(mode.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeMode === mode.id ? "bg-brand text-brand-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}>
                                    <mode.icon className="w-4 h-4" /> {mode.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative flex flex-col items-center justify-center p-10 md:p-16 rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
                            <div className={`absolute inset-0 opacity-20 blur-3xl transition-colors ${activeMode === 'focus' ? 'bg-brand' : activeMode === 'shortBreak' ? 'bg-electric' : 'bg-flame'}`} />
                            <div className="relative z-10 text-center space-y-8">
                                <h2 className={`text-7xl md:text-9xl font-display font-bold tracking-tighter transition-colors ${activeMode === 'focus' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {formatTime(timeLeft)}
                                </h2>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={handleReset} className="p-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><RotateCcw className="w-6 h-6" /></button>
                                    <button onClick={() => setIsRunning(!isRunning)} className={`p-5 rounded-full shadow-lg transition-all active:scale-95 ${activeMode === 'focus' ? 'bg-brand text-brand-foreground shadow-brand/30 hover:bg-brand/90' : 'bg-electric text-electric-foreground shadow-electric/30 hover:bg-electric/90'}`}>
                                        {isRunning ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
                                    </button>
                                    <button onClick={() => { setIsRunning(false); setTimeLeft(0); if(activeMode==='focus') handleFocusComplete(); }} className="p-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><SkipForward className="w-6 h-6" /></button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
                            <input type="text" placeholder="What are you focusing on right now?" className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm md:text-base" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* ✅ NEW: Global Background Music Controls */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <h3 className="font-display font-semibold text-foreground text-lg flex items-center gap-2">
                                <Music className="w-5 h-5 text-purple-500" /> Background Music
                            </h3>
                            <p className="text-xs text-muted-foreground">Keep the beat playing across all pages.</p>
                            
                            <div className="flex items-center gap-3">
                                <select 
                                    value={currentBeat?.id || ""} 
                                    onChange={(e) => setCurrentBeat(BEATS.find(b => b.id === e.target.value))}
                                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Select a beat...</option>
                                    {BEATS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                               <button 
  onClick={() => {
    const beat = FREE_BEATS.find(b => b.id === selectedBeatId);
    if (beat) {
      if (isBeatPlaying) {
        pauseBeat();
      } else {
        playBeat(beat);
      }
    }
  }}
  disabled={!currentBeat && !selectedBeatId}
  className={`p-3 rounded-full transition-colors ${isBeatPlaying ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground hover:bg-purple-500/10 hover:text-purple-500'} disabled:opacity-50`}
>
  {isBeatPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
</button>
                            </div>
                            
                            {currentBeat && (
                                <div className="flex items-center gap-3 pt-2">
                                    <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <input type="range" min="0" max="1" step="0.05" value={localVolume} onChange={(e) => setLocalVolume(Number(e.target.value))} className="w-full accent-purple-600" />
                                </div>
                            )}
                        </div>

                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <h3 className="font-display font-semibold text-foreground text-lg">Session Settings</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-foreground">Focus Duration</label><span className="text-sm font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">25m</span></div>
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-foreground">Short Break</label><span className="text-sm font-bold text-electric bg-electric/10 px-2 py-0.5 rounded">5m</span></div>
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-foreground">Long Break</label><span className="text-sm font-bold text-flame bg-flame/10 px-2 py-0.5 rounded">15m</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}