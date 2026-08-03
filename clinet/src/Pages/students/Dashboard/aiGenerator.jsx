import { FileText, Video, Music, Sparkles, Wand2, Clock, Play } from "lucide-react";
import { useState } from "react";

export default function StudentAiGenerator() {
    // FIXED LOGIC: Use a single state to track the active mode. 
    // This prevents multiple options from being selected at the same time.
    const [activeMode, setActiveMode] = useState('summary');
    const [notesText, setNotesText] = useState('');

    // Defined the modes with their specific Tailwind classes (Tailwind needs full class names, not dynamic variables)
    const modes = [
        { 
            id: 'summary', label: 'Note Summary', desc: 'Audio + bulleted recap', icon: FileText, 
            cardActive: 'border-brand bg-brand/5', 
            iconActive: 'bg-brand/10 text-brand', 
            btnBg: 'bg-brand text-brand-foreground shadow-brand/20' 
        },
        { 
            id: 'video', label: 'Animated Video', desc: '4K Animated Scenes', icon: Video, 
            cardActive: 'border-electric bg-electric/5', 
            iconActive: 'bg-electric/10 text-electric', 
            btnBg: 'bg-electric text-electric-foreground shadow-electric/20' 
        },
        { 
            id: 'music', label: 'Study Music', desc: 'Lyrics that stick', icon: Music, 
            cardActive: 'border-flame bg-flame/5', 
            iconActive: 'bg-flame/10 text-flame', 
            btnBg: 'bg-flame text-flame-foreground shadow-flame/20' 
        },
    ];

    // Get the data for the currently selected mode to use in the UI
    const currentMode = modes.find(m => m.id === activeMode);

    return (
        // Deep background for light mode, standard for dark mode
        <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                
                {/* Header */}
                <div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Wand2 className="w-8 h-8 text-brand" /> AI Generator
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">Drop in messy notes and get audio, visuals, and a clean summary back.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* ==========================================
                        LEFT COLUMN: INPUT & SETTINGS
                        ========================================== */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* 1. Output Selection */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <div>
                                <h2 className="text-lg font-display font-semibold text-foreground">What should the AI make?</h2>
                                <p className="text-sm text-muted-foreground">Pick an output, paste your notes, and let it do the boring part.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {modes.map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setActiveMode(mode.id)}
                                        className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                                            activeMode === mode.id
                                                ? `${mode.cardActive} shadow-md`
                                                : 'border-border bg-background hover:bg-accent/50'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg transition-colors ${
                                            activeMode === mode.id ? mode.iconActive : 'bg-muted text-muted-foreground'
                                        }`}>
                                            <mode.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm text-foreground">{mode.label}</h3>
                                            <p className="text-xs text-muted-foreground mt-1">{mode.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Notes Input */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <label className="text-sm font-medium text-foreground">Your Messy Notes</label>
                            <textarea
                                value={notesText}
                                onChange={(e) => setNotesText(e.target.value)}
                                rows={8}
                                placeholder="Paste your messy notes, lecture transcripts, or textbook chapters here..."
                                className="flex w-full rounded-lg border border-input bg-background p-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{notesText.length} characters</span>
                                <span>Tip: The more context you give, the better the output!</span>
                            </div>
                        </div>

                        {/* 3. Customization Options & Generate */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
                            <h2 className="text-lg font-display font-semibold text-foreground">Customize Output</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Voice Vibe</label>
                                    <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <option>Enthusiastic Teacher</option>
                                        <option>Chill Storyteller</option>
                                        <option>Hype Rap</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Animation Style</label>
                                    <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <option>Cartoon Explainer</option>
                                        <option>Whiteboard Doodle</option>
                                        <option>Anime Lecture</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Genre</label>
                                    <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <option>Lo-fi Study Beat</option>
                                        <option>Catchy Pop Hook</option>
                                        <option>Memory Trap Anthem</option>
                                    </select>
                                </div>
                            </div>

                            {/* Generate Button (Changes color based on selected mode) */}
                            <button 
                                disabled={!notesText.trim()}
                                className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${currentMode.btnBg}`}
                            >
                                <Sparkles className="w-5 h-5" />
                                Generate {currentMode.label}
                            </button>
                        </div>
                    </div>

                    {/* ==========================================
                        RIGHT COLUMN: OUTPUT PREVIEW & HISTORY
                        ========================================== */}
                    <div className="space-y-6">
                        
                        {/* Output Preview Placeholder */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col items-center justify-center text-center min-h-[300px] space-y-4">
                            <div className={`p-4 rounded-full transition-colors ${currentMode.iconActive}`}>
                                <currentMode.icon className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-display font-semibold text-foreground">Nothing generated yet</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                    Your {currentMode.label.toLowerCase()} will show up right here, ready to play, download, or turn into a quiz.
                                </p>
                            </div>
                        </div>

                        {/* Recent Generations (Added Feature) */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-display font-semibold text-foreground">Recent Generations</h3>
                                <Clock className="w-4 h-4 text-muted-foreground" />
                            </div>
                            
                            <div className="space-y-3">
                                {/* Mock Item 1 */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border hover:bg-accent/50 transition-colors cursor-pointer group">
                                    <div className="p-2 rounded-lg bg-brand/10 text-brand">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">Biology 101 Summary</p>
                                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                                    </div>
                                    <Play className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                {/* Mock Item 2 */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border hover:bg-accent/50 transition-colors cursor-pointer group">
                                    <div className="p-2 rounded-lg bg-flame/10 text-flame">
                                        <Music className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">History Lo-Fi Track</p>
                                        <p className="text-xs text-muted-foreground">Yesterday</p>
                                    </div>
                                    <Play className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}