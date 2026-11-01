import { useRef, useEffect } from "react";
import { Brain, CircleHelp, MessageSquare, PanelLeft, Search, Sparkles, Sun, Moon, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme"; 

export default function StudentTopBar({ onToggleSidebar }) {
    const searchInputRef = useRef(null);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault(); 
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6">
            <button 
                onClick={onToggleSidebar}
                className="md:hidden p-2 rounded-md hover:bg-accent text-foreground transition-colors"
            >
                <PanelLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col">
                <h2 className="text-lg font-display font-semibold text-foreground">Dashboard</h2>
                <p className="text-xs text-muted-foreground hidden sm:block">Welcome back, let's get some studying done.</p>
            </div>

            <div className="flex-1" />

            <details className="group relative">
                <summary aria-label="Quick actions" className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent [&::-webkit-details-marker]:hidden">
                    <Zap className="h-4 w-4 text-brand" />
                    <span className="hidden md:inline">Quick actions</span>
                </summary>
                <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                    <Link to="/quiz" onClick={(event) => { event.currentTarget.closest("details").open = false; }} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent">
                        <Brain className="h-4 w-4 text-brand" />
                        Create quiz
                    </Link>
                    <Link to="/aiGenerator" onClick={(event) => { event.currentTarget.closest("details").open = false; }} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent">
                        <Sparkles className="h-4 w-4 text-brand" />
                        Generate summary
                    </Link>
                </div>
            </details>

            <details className="group relative">
                <summary aria-label="Help and support" className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent [&::-webkit-details-marker]:hidden">
                    <CircleHelp className="h-4 w-4 text-brand" />
                    <span className="hidden md:inline">Help &amp; support</span>
                </summary>
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                    <Link to="/help/student" onClick={(event) => { event.currentTarget.closest("details").open = false; }} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent">
                        <CircleHelp className="h-4 w-4 text-brand" />
                        Student guide
                    </Link>
                    <Link to="/support" onClick={(event) => { event.currentTarget.closest("details").open = false; }} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent">
                        <MessageSquare className="h-4 w-4 text-brand" />
                        Contact support
                    </Link>
                </div>
            </details>

            <div className="hidden sm:flex items-center relative max-w-xs w-full">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search notes, quizzes..."
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                />
                <kbd className="pointer-events-none absolute right-3 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={toggleTheme}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
            </div>
        </header>
    );
}