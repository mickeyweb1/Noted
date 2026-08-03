import { useState } from "react";
import { 
    Library as LibraryIcon, Search, Filter, Grid3x3, List, 
    FileText, Video, Music, Brain, FolderOpen, MoreHorizontal,
    TrendingUp, Users, Star, Download, Play, Eye
} from "lucide-react";

export default function StudentLibrary() {
    // State for switching between Personal and Community views
    const [activeTab, setActiveTab] = useState('my-library');
    const [viewStyle, setViewStyle] = useState('grid'); // grid or list
    const [activeFilter, setActiveFilter] = useState('all');

    // Mock data for "My Library" (User's own generations)
    const myGenerations = [
        { id: 1, type: 'summary', title: 'Biology 101: Cell Structure', date: 'Oct 24', duration: '4:12 audio', icon: FileText, color: 'brand' },
        { id: 2, type: 'video', title: 'History: World War II Explained', date: 'Oct 22', duration: '8:30 video', icon: Video, color: 'electric' },
        { id: 3, type: 'music', title: 'Chemistry Periodic Table Lo-Fi', date: 'Oct 20', duration: '15:00 track', icon: Music, color: 'flame' },
        { id: 4, type: 'quiz', title: 'Physics: Kinematics Quiz', date: 'Oct 18', duration: '10 questions', icon: Brain, color: 'brand' },
    ];

    // Mock data for "Discover" (Other users' public content)
    const trendingContent = [
        { id: 5, type: 'summary', title: 'Complete Guide to Calculus II', author: 'Sarah M.', views: '12.4k', rating: 4.9, icon: FileText, color: 'brand' },
        { id: 6, type: 'video', title: 'Organic Chemistry Reactions Animated', author: 'Alex T.', views: '8.2k', rating: 4.8, icon: Video, color: 'electric' },
        { id: 7, type: 'music', title: 'Anatomy & Physiology Study Anthem', author: 'Jordan K.', views: '5.1k', rating: 4.7, icon: Music, color: 'flame' },
    ];

    const filters = [
        { id: 'all', label: 'All', icon: FolderOpen },
        { id: 'summary', label: 'Summaries', icon: FileText },
        { id: 'video', label: 'Videos', icon: Video },
        { id: 'music', label: 'Music', icon: Music },
        { id: 'quiz', label: 'Quizzes', icon: Brain },
    ];

    return (
        // Deep background for light mode, standard for dark mode
        <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                
                {/* ==========================================
                    1. HEADER & TAB SWITCHER
                    ========================================== */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
                            <LibraryIcon className="w-8 h-8 text-brand" /> Library
                        </h1>
                        <p className="text-muted-foreground mt-1">Your personal archive and community study materials.</p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-card rounded-xl border border-border shadow-sm w-fit">
                        <button
                            onClick={() => setActiveTab('my-library')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'my-library' 
                                    ? 'bg-brand text-brand-foreground shadow-md' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            My Library
                        </button>
                        <button
                            onClick={() => setActiveTab('discover')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                activeTab === 'discover' 
                                    ? 'bg-electric text-electric-foreground shadow-md' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Users className="w-4 h-4" /> Discover
                        </button>
                    </div>
                </div>

                {/* ==========================================
                    2. SEARCH & FILTERS (Only show in My Library)
                    ========================================== */}
                {activeTab === 'my-library' && (
                    <div className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input 
                                type="text" 
                                placeholder="Search your notes, videos, and quizzes..." 
                                className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>

                        {/* Filter Pills & View Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {filters.map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setActiveFilter(filter.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                                            activeFilter === filter.id
                                                ? 'bg-foreground text-background'
                                                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <filter.icon className="w-3.5 h-3.5" />
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            {/* Grid/List View Toggle */}
                            <div className="hidden md:flex items-center gap-1 p-1 bg-card rounded-lg border border-border">
                                <button 
                                    onClick={() => setViewStyle('grid')}
                                    className={`p-1.5 rounded-md ${viewStyle === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <Grid3x3 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setViewStyle('list')}
                                    className={`p-1.5 rounded-md ${viewStyle === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==========================================
                    3. CONTENT AREA
                    ========================================== */}
                
                {/* VIEW A: MY LIBRARY (Personal Content) */}
                {activeTab === 'my-library' && (
                    <div className={viewStyle === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
                        {myGenerations
                            .filter(item => activeFilter === 'all' || item.type === activeFilter)
                            .map((item) => (
                            <div key={item.id} className={`group relative p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all cursor-pointer ${viewStyle === 'list' ? 'flex items-center gap-4' : ''}`}>
                                
                                {/* Icon / Thumbnail Area */}
                                <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-${item.color}/10 text-${item.color} mb-3 ${viewStyle === 'list' ? 'mb-0 shrink-0' : ''}`}>
                                    <item.icon className="w-6 h-6" />
                                </div>

                                {/* Text Content */}
                                <div className={viewStyle === 'list' ? 'flex-1 min-w-0' : ''}>
                                    <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-brand transition-colors">{item.title}</h3>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <span>{item.date}</span>
                                        <span>•</span>
                                        <span>{item.duration}</span>
                                    </div>
                                </div>

                                {/* Action Menu (3 dots) */}
                                <button className="absolute top-3 right-3 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* VIEW B: DISCOVER (Community Content) */}
                {activeTab === 'discover' && (
                    <div className="space-y-6">
                        {/* Trending Banner */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-electric-soft to-electric/10 border border-electric/20 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-electric" /> Trending this week
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">See what other students are studying right now.</p>
                            </div>
                            <button className="px-4 py-2 rounded-lg bg-electric text-electric-foreground text-sm font-medium hover:bg-electric/90 transition-colors">
                                View All
                            </button>
                        </div>

                        {/* Community Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trendingContent.map((item) => (
                                <div key={item.id} className="flex flex-col p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all group">
                                    
                                    {/* Top: Icon & Type */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`p-2.5 rounded-xl bg-${item.color}/10 text-${item.color}`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.type}</span>
                                    </div>

                                    {/* Middle: Title & Author */}
                                    <h3 className="text-lg font-display font-semibold text-foreground leading-snug group-hover:text-electric transition-colors">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">by {item.author}</p>

                                    {/* Bottom: Stats & Action */}
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {item.views}</span>
                                            <span className="flex items-center gap-1 text-flame"><Star className="w-3.5 h-3.5 fill-current" /> {item.rating}</span>
                                        </div>
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors">
                                            <Download className="w-3.5 h-3.5" /> Save
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}