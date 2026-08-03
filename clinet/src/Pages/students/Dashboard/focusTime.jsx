import { useState } from "react";
import { 
    Play, Pause, RotateCcw, SkipForward, 
    Coffee, Brain, Moon, CloudRain, Music, 
    CheckCircle2, Target
} from "lucide-react";

export default function FocusTime() {
    // Minimal state just to make the UI buttons feel interactive
    const [isRunning, setIsRunning] = useState(false);
    const [activeMode, setActiveMode] = useState("focus"); // focus, shortBreak, longBreak
    const [activeSound, setActiveSound] = useState("rain");

    // Mock timer display (UI only)
    const timerDisplay = activeMode === "focus" ? "25:00" : activeMode === "shortBreak" ? "05:00" : "15:00";

    const modes = [
        { id: "focus", label: "Focus", icon: Brain, time: "25m" },
        { id: "shortBreak", label: "Short Break", icon: Coffee, time: "5m" },
        { id: "longBreak", label: "Long Break", icon: Moon, time: "15m" },
    ];

    const sounds = [
        { id: "rain", label: "Rain", icon: CloudRain },
        { id: "lofi", label: "Lo-Fi", icon: Music },
        { id: "none", label: "Silence", icon: Coffee },
    ];

    return (
        // MAIN WRAPPER: Deep off-white in light mode, standard dark in dark mode
        <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300">
            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
                
                {/* ==========================================
                    1. HEADER & DAILY PROGRESS
                    ========================================== */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
                            Focus Time
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Lock in, block out distractions, and get things done.
                        </p>
                    </div>
                    
                    {/* Daily Progress Pill */}
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
                        <Target className="w-4 h-4 text-brand" />
                        <span className="text-sm font-medium text-foreground">Daily Goal:</span>
                        <span className="text-sm font-bold text-brand">3 of 4</span>
                        <span className="text-xs text-muted-foreground">sessions</span>
                    </div>
                </div>

                {/* ==========================================
                    2. MAIN GRID LAYOUT
                    ========================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT/CENTER: THE TIMER (Takes 2 columns on desktop) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Mode Selector Tabs */}
                        <div className="flex gap-2 p-1.5 bg-card rounded-xl border border-border shadow-sm w-fit">
                            {modes.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setActiveMode(mode.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        activeMode === mode.id
                                            ? "bg-brand text-brand-foreground shadow-md"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    }`}
                                >
                                    <mode.icon className="w-4 h-4" />
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        {/* The Giant Timer Card */}
                        <div className="relative flex flex-col items-center justify-center p-10 md:p-16 rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
                            {/* Subtle background glow based on mode */}
                            <div className={`absolute inset-0 opacity-20 blur-3xl transition-colors ${
                                activeMode === 'focus' ? 'bg-brand' : activeMode === 'shortBreak' ? 'bg-electric' : 'bg-flame'
                            }`} />

                            <div className="relative z-10 text-center space-y-8">
                                {/* The Timer Text */}
                                <h2 className={`text-7xl md:text-9xl font-display font-bold tracking-tighter transition-colors ${
                                    activeMode === 'focus' ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                    {timerDisplay}
                                </h2>

                                {/* Controls */}
                                <div className="flex items-center justify-center gap-4">
                                    <button className="p-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                        <RotateCcw className="w-6 h-6" />
                                    </button>
                                    
                                    <button 
                                        onClick={() => setIsRunning(!isRunning)}
                                        className={`p-5 rounded-full shadow-lg transition-all active:scale-95 ${
                                            activeMode === 'focus' 
                                                ? 'bg-brand text-brand-foreground shadow-brand/30 hover:bg-brand/90' 
                                                : 'bg-electric text-electric-foreground shadow-electric/30 hover:bg-electric/90'
                                        }`}
                                    >
                                        {isRunning ? (
                                            <Pause className="w-8 h-8" fill="currentColor" />
                                        ) : (
                                            <Play className="w-8 h-8 ml-1" fill="currentColor" />
                                        )}
                                    </button>

                                    <button className="p-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                        <SkipForward className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Current Task Input */}
                        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
                            <input 
                                type="text" 
                                placeholder="What are you focusing on right now? (e.g., Biology Chapter 4)"
                                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm md:text-base"
                            />
                        </div>
                    </div>

                    {/* RIGHT: SETTINGS & AMBIENCE (Takes 1 column on desktop) */}
                    <div className="space-y-6">
                        
                        {/* Session Settings */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
                            <h3 className="font-display font-semibold text-foreground text-lg">Session Settings</h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-foreground">Focus Duration</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">25m</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-foreground">Short Break</label>
                                    <span className="text-sm font-bold text-electric bg-electric/10 px-2 py-0.5 rounded">5m</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-foreground">Long Break</label>
                                    <span className="text-sm font-bold text-flame bg-flame/10 px-2 py-0.5 rounded">15m</span>
                                </div>
                            </div>
                            
                            <button className="w-full mt-2 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                                Customize Durations
                            </button>
                        </div>

                        {/* Ambient Sounds */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <h3 className="font-display font-semibold text-foreground text-lg">Ambient Sounds</h3>
                            <p className="text-xs text-muted-foreground">Block out noise and get in the zone.</p>
                            
                            <div className="grid grid-cols-3 gap-2">
                                {sounds.map((sound) => (
                                    <button
                                        key={sound.id}
                                        onClick={() => setActiveSound(sound.id)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                            activeSound === sound.id
                                                ? "bg-brand/10 border-brand text-brand"
                                                : "bg-transparent border-border text-muted-foreground hover:bg-accent/50"
                                        }`}
                                    >
                                        <sound.icon className="w-5 h-5" />
                                        <span className="text-xs font-medium">{sound.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Motivation / Streak Card */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-flame-soft to-flame/10 border border-flame/20 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🔥</span>
                                <h3 className="font-display font-bold text-flame">9 Day Streak!</h3>
                            </div>
                            <p className="text-sm text-foreground/80">
                                You're on fire! Complete 1 more session today to keep your streak alive. Don't break the chain!
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}