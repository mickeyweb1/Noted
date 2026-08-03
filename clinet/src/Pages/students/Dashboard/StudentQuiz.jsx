import { useState } from "react";
import { 
    Brain, Trophy, Target, Clock, ChevronRight, 
    Plus, CheckCircle2, XCircle, Sparkles, RotateCcw,
    FileText, Zap
} from "lucide-react";

export default function StudentQuiz() {
    // Interactive state for the "Active Quiz" mockup
    const [selectedOption, setSelectedOption] = useState(null);
    const correctAnswer = "Mitochondria";

    const handleOptionClick = (option) => {
        setSelectedOption(option);
    };

    // Mock data for Recent Quizzes
    const recentQuizzes = [
        { id: 1, title: "Biology 101: Cell Structure", date: "2 hours ago", score: 90, total: 10, icon: Brain, color: "brand" },
        { id: 2, title: "History: World War II", date: "Yesterday", score: 70, total: 10, icon: FileText, color: "flame" },
        { id: 3, title: "Chemistry: Periodic Table", date: "3 days ago", score: 100, total: 10, icon: Zap, color: "electric" },
    ];

    return (
        // Deep background for light mode, standard for dark mode
        <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                
                {/* ==========================================
                    1. HEADER & STATS
                    ========================================== */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
                            <Brain className="w-8 h-8 text-electric" /> Quiz Mode
                        </h1>
                        <p className="text-muted-foreground mt-1">Test your knowledge and lock in what you've learned.</p>
                    </div>
                    
                    {/* Quick Stats Pills */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
                            <Trophy className="w-4 h-4 text-flame" />
                            <span className="text-sm font-bold text-foreground">85%</span>
                            <span className="text-xs text-muted-foreground">Avg Score</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
                            <Zap className="w-4 h-4 text-electric" />
                            <span className="text-sm font-bold text-foreground">5</span>
                            <span className="text-xs text-muted-foreground">Day Streak</span>
                        </div>
                    </div>
                </div>

                {/* ==========================================
                    2. MAIN GRID LAYOUT
                    ========================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT/CENTER: ACTIVE QUIZ & HISTORY (Takes 2 columns) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Active Quiz Card (Interactive Mockup) */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-md bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider">In Progress</span>
                                    <span className="text-sm text-muted-foreground">Biology 101</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-4 h-4" /> 14:32
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Question 3 of 10</span>
                                    <span>30%</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full w-[30%] bg-brand rounded-full transition-all" />
                                </div>
                            </div>

                            {/* The Question */}
                            <div className="py-4">
                                <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground leading-relaxed">
                                    What is often referred to as the "powerhouse" of the cell?
                                </h2>
                            </div>

                            {/* The Options (Interactive) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {["Nucleus", "Mitochondria", "Ribosome", "Golgi Apparatus"].map((option) => {
                                    let optionStyle = "border-border bg-background hover:bg-accent/50";
                                    
                                    if (selectedOption) {
                                        if (option === correctAnswer) {
                                            optionStyle = "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400";
                                        } else if (option === selectedOption && option !== correctAnswer) {
                                            optionStyle = "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400";
                                        } else {
                                            optionStyle = "border-border bg-background opacity-50";
                                        }
                                    }

                                    return (
                                        <button
                                            key={option}
                                            onClick={() => !selectedOption && handleOptionClick(option)}
                                            disabled={!!selectedOption}
                                            className={`flex items-center justify-between p-4 rounded-xl border-2 text-left font-medium transition-all ${optionStyle}`}
                                        >
                                            <span>{option}</span>
                                            {selectedOption && option === correctAnswer && <CheckCircle2 className="w-5 h-5" />}
                                            {selectedOption && option === selectedOption && option !== correctAnswer && <XCircle className="w-5 h-5" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Bottom Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                    <RotateCcw className="w-4 h-4" /> Skip Question
                                </button>
                                <button 
                                    disabled={!selectedOption}
                                    className="px-6 py-2 rounded-lg bg-brand text-brand-foreground font-medium text-sm shadow-md hover:bg-brand/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next Question
                                </button>
                            </div>
                        </div>

                        {/* Recent Quizzes History */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-display font-semibold text-foreground">Recent Quizzes</h2>
                                <button className="text-xs font-medium text-brand hover:underline flex items-center gap-1">
                                    View all <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {recentQuizzes.map((quiz) => (
                                    <div key={quiz.id} className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border hover:bg-accent/30 transition-colors group cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-lg bg-${quiz.color}/10 text-${quiz.color}`}>
                                                <quiz.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">{quiz.title}</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">{quiz.date} • {quiz.total} Questions</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <span className={`text-lg font-bold ${quiz.score >= 80 ? 'text-brand' : quiz.score >= 60 ? 'text-flame' : 'text-destructive'}`}>
                                                {quiz.score}%
                                            </span>
                                            <button className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-background transition-colors">
                                                Retake
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: GENERATE NEW & PERFORMANCE (Takes 1 column) */}
                    <div className="space-y-6">
                        
                        {/* Generate New Quiz */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-electric-soft to-electric/10 border border-electric/20 shadow-sm space-y-5">
                            <div>
                                <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-electric" /> Generate New Quiz
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">Pick a note and let AI test your knowledge.</p>
                            </div>

                            <div className="space-y-3">
                                <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <option>Select a note...</option>
                                    <option>Biology 101: Cell Structure</option>
                                    <option>History: World War II</option>
                                    <option>Chemistry: Periodic Table</option>
                                </select>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-foreground">Questions</label>
                                        <select className="flex h-9 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm">
                                            <option>5</option>
                                            <option>10</option>
                                            <option>20</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-foreground">Type</label>
                                        <select className="flex h-9 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm">
                                            <option>Multiple</option>
                                            <option>True/False</option>
                                        </select>
                                    </div>
                                </div>

                                <button className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-electric text-electric-foreground font-semibold text-sm shadow-lg shadow-electric/20 hover:bg-electric/90 transition-all active:scale-[0.98]">
                                    <Target className="w-4 h-4" /> Generate Quiz
                                </button>
                            </div>
                        </div>

                        {/* Performance Insights */}
                        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                            <h3 className="text-lg font-display font-semibold text-foreground">Performance Insights</h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Strongest Subject</span>
                                    <span className="text-sm font-bold text-foreground">Chemistry</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Needs Improvement</span>
                                    <span className="text-sm font-bold text-flame">History</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Total Time Studied</span>
                                    <span className="text-sm font-bold text-foreground">12.5 hrs</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <button className="w-full text-center text-sm font-medium text-brand hover:underline">
                                    View Detailed Analytics →
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}