import { useRef, useEffect } from "react";
import { PanelLeft, Bell, Search } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";

export default function StudentTopBar({ onToggleSidebar }) {
    const searchInputRef = useRef(null);

    // Logic: Listen for Cmd+K or Ctrl+K to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault(); // Prevent default browser search
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6">
            
            {/* Mobile Menu Toggle */}
            <button 
                onClick={onToggleSidebar}
                className="md:hidden p-2 rounded-md hover:bg-accent text-foreground transition-colors"
            >
                <PanelLeft className="w-5 h-5" />
            </button>

            {/* Page Title / Breadcrumb Area */}
            <div className="flex flex-col">
                <h2 className="text-lg font-display font-semibold text-foreground">Dashboard</h2>
                <p className="text-xs text-muted-foreground hidden sm:block">Welcome back, let's get some studying done.</p>
            </div>

            <div className="flex-1" />

            {/* Search Bar */}
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

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
                <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flame opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-flame"></span>
                    </span>
                </button>

                <ThemeToggle />
            </div>
        </header>
    );
}