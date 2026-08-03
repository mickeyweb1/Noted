import { NavLink } from "react-router-dom";
import { useUserContext } from "../../../userContext";
import { Clock, BookOpen, Trophy, Zap, ArrowRight, Sparkles } from "lucide-react";

export default function StudentHome() {
    const { user } = useUserContext();

    // Safe fallback in case user data isn't loaded yet
    const userName = user?.firstName || user?.fullName || "Student";

    // Date Logic
    const date = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayOfMonth = date.getDate(); // Fixed: shows actual date (e.g., 15), not day index (0-6)

    const hours = date.getHours();
    let period = "";
    if (hours >= 5 && hours < 12) period = "Good morning";
    else if (hours >= 12 && hours < 17) period = "Good afternoon";
    else if (hours >= 17 && hours < 21) period = "Good evening";
    else period = "Late night Study";

    const dateInfo = `${dayName}, ${monthName} ${dayOfMonth}`;

    return (
        <section className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
            
            {/* ==========================================
                1. TOP SECTION: Greeting & Quick Actions 
                (With Linear Gradient)
                ========================================== */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-soft via-accent/40 to-electric-soft border border-border p-6 md:p-8 shadow-soft">
                {/* Decorative background blur circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-electric/20 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                            {dateInfo}
                        </p>
                        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
                            {period}, {userName}! <br />
                            <span className="text-muted-foreground">Ready to learn something new?</span>
                        </h2>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <NavLink 
                            to="/aiGenerator" 
                            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-brand text-brand-foreground font-semibold text-sm shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all hover:scale-105 active:scale-95"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate AI Summary
                        </NavLink>
                        
                        <NavLink 
                            to="/focusTime" 
                            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-background text-foreground border border-border font-semibold text-sm hover:bg-accent hover:text-accent-foreground transition-all hover:scale-105 active:scale-95"
                        >
                            <Clock className="w-4 h-4" />
                            Start Focus
                        </NavLink>
                    </div>
                </div>
            </div>

            {/* ==========================================
                2. BOTTOM SECTION: Stats & Recent Activity
                ========================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Column: Stats (Takes up 2 columns on desktop) */}
                <div className="md:col-span-2 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-card border border-border shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                                <Trophy className="w-4 h-4 text-flame" /> Study Streak
                            </div>
                            <span className="text-2xl font-display font-bold text-foreground">9 Days</span>
                        </div>
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-card border border-border shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                                <BookOpen className="w-4 h-4 text-brand" /> Total Notes
                            </div>
                            <span className="text-2xl font-display font-bold text-foreground">24</span>
                        </div>
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-card border border-border shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                                <Zap className="w-4 h-4 text-electric" /> Focus Hours
                            </div>
                            <span className="text-2xl font-display font-bold text-foreground">12.5h</span>
                        </div>
                    </div>

                    {/* Recent Notes List */}
                    <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="font-display font-semibold text-foreground">Recent Notes</h3>
                            <NavLink to="/myLibrary" className="text-xs font-medium text-brand hover:underline flex items-center gap-1">
                                View all <ArrowRight className="w-3 h-3" />
                            </NavLink>
                        </div>
                        <div className="divide-y divide-border">
                            {/* Mock Item 1 */}
                            <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground group-hover:text-brand transition-colors">Biology 101: Cell Structure</p>
                                        <p className="text-xs text-muted-foreground">Generated 2 hours ago</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {/* Mock Item 2 */}
                            <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center text-electric">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground group-hover:text-electric transition-colors">History: World War II Summary</p>
                                        <p className="text-xs text-muted-foreground">Generated yesterday</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Upcoming / Promo Card (Takes up 1 column on desktop) */}
                <div className="space-y-6">
                    <div className="rounded-xl bg-gradient-to-br from-flame-soft to-flame/10 border border-flame/20 p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="font-display font-bold text-flame">Daily Challenge</h3>
                            <Sparkles className="w-5 h-5 text-flame" />
                        </div>
                        <p className="text-sm text-foreground/80 mb-4">
                            Complete a 25-minute focus session today to keep your 9-day streak alive!
                        </p>
                        <NavLink 
                            to="/focusTime"
                            className="w-full inline-flex items-center justify-center h-9 rounded-lg bg-flame text-flame-foreground font-medium text-sm hover:bg-flame/90 transition-colors"
                        >
                            Start Session
                        </NavLink>
                    </div>

                    <div className="rounded-xl bg-card border border-border p-5 shadow-sm">
                        <h3 className="font-display font-semibold text-foreground mb-3">Upcoming Quiz</h3>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
                                OCT<br/>24
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">Chemistry Midterm</p>
                                <p className="text-xs text-muted-foreground">10 Questions • 15 mins</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}