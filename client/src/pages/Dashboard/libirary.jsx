import { useState, useEffect } from "react";
import { 
    Library as LibraryIcon, Search, Grid3x3, List, 
    FileText, Video, Music, Brain, FolderOpen, MoreHorizontal,
    TrendingUp, Users, Star, Download, Eye, X, CheckCircle2
} from "lucide-react";
import api from "../../utils/api";
import AudioPlayer from "../../components/AudioPlayer";

// ✅ NEW: Premium Skeleton Loader
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-muted rounded-md ${className}`} />
);

export default function StudentLibrary() {
    const [activeTab, setActiveTab] = useState('my-library');
    const [viewStyle, setViewStyle] = useState('grid');
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [myGenerations, setMyGenerations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const response = await api.get('/ai/library');
                if (response.data.success) {
                    const formattedData = response.data.data.map(item => ({
                        id: item._id,
                        type: item.type,
                        title: item.title,
                        subject: item.subject,
                        date: new Date(item.createdAt).toLocaleDateString(),
                        categoryLabel: item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Note',
                        generatedText: item.generatedText,
                        color: item.type === 'summary' ? 'brand' : item.type === 'video' ? 'electric' : item.type === 'music' ? 'flame' : 'brand',
                        icon: item.type === 'summary' ? FileText : item.type === 'video' ? Video : item.type === 'music' ? Music : Brain
                    }));
                    setMyGenerations(formattedData);
                }
            } catch (error) {
                console.error("Failed to fetch library:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLibrary();
    }, []);

    const filters = [
        { id: 'all', label: 'All', icon: FolderOpen },
        { id: 'summary', label: 'Summaries', icon: FileText },
        { id: 'video', label: 'Videos', icon: Video },
        { id: 'music', label: 'Music', icon: Music },
        { id: 'quiz', label: 'Quizzes', icon: Brain },
    ];

    const filteredGenerations = myGenerations.filter(item => {
        const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (item.subject && item.subject.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    const handleDownload = () => {
        if (!selectedItem || !selectedItem.generatedText) return;
        const content = `TITLE: ${selectedItem.title}\nTYPE: ${selectedItem.categoryLabel}\nDATE: ${selectedItem.date}\n\n${selectedItem.generatedText}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedItem.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300">
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
                            <LibraryIcon className="w-8 h-8 text-brand" /> Library
                        </h1>
                        <p className="text-muted-foreground mt-1">Your personal archive and community study materials.</p>
                    </div>
                    <div className="flex p-1 bg-card rounded-xl border border-border shadow-sm w-fit">
                        <button onClick={() => setActiveTab('my-library')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'my-library' ? 'bg-brand text-brand-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>My Library</button>
                        <button onClick={() => setActiveTab('discover')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === 'discover' ? 'bg-electric text-electric-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}><Users className="w-4 h-4" /> Discover</button>
                    </div>
                </div>

                {activeTab === 'my-library' && (
                    <div className="space-y-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search your notes, videos, and quizzes..." className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 transition-all" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {filters.map((filter) => (
                                    <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 hover:scale-105 active:scale-95 ${activeFilter === filter.id ? 'bg-foreground text-background' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
                                        <filter.icon className="w-3.5 h-3.5" />{filter.label}
                                    </button>
                                ))}
                            </div>
                            <div className="hidden md:flex items-center gap-1 p-1 bg-card rounded-lg border border-border">
                                <button onClick={() => setViewStyle('grid')} className={`p-1.5 rounded-md transition-all duration-200 ${viewStyle === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Grid3x3 className="w-4 h-4" /></button>
                                <button onClick={() => setViewStyle('list')} className={`p-1.5 rounded-md transition-all duration-200 ${viewStyle === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'my-library' && (
                    <div className={viewStyle === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
                        {isLoading ? (
                            // ✅ PREMIUM SKELETON GRID
                            <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                                        <Skeleton className="w-12 h-12 rounded-xl" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            filteredGenerations.map((item) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => setSelectedItem(item)} 
                                    className={`group relative p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-brand/30 transition-all duration-300 cursor-pointer ${viewStyle === 'list' ? 'flex items-center gap-4 hover:translate-y-0' : ''}`}
                                >
                                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-${item.color}/10 text-${item.color} mb-3 group-hover:scale-110 transition-transform duration-300 ${viewStyle === 'list' ? 'mb-0 shrink-0' : ''}`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <div className={viewStyle === 'list' ? 'flex-1 min-w-0' : ''}>
                                        <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-brand transition-colors duration-200">{item.title}</h3>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <span className="font-medium text-foreground/80">{item.categoryLabel}</span><span>•</span><span>{item.date}</span>
                                        </div>
                                    </div>
                                    <button className="absolute top-3 right-3 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-accent transition-all duration-200"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                                </div>
                            ))
                        )}
                        {!isLoading && filteredGenerations.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <FolderOpen className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">No items found</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Try adjusting your search or filters, or generate new notes!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ✅ POLISHED MODAL */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedItem(null)}>
                    <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-border animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
                            <div>
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <selectedItem.icon className={`w-5 h-5 text-${selectedItem.color}`} /> 
                                    {selectedItem.title}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">{selectedItem.categoryLabel} • {selectedItem.date}</p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {selectedItem.generatedText && <AudioPlayer text={selectedItem.generatedText} title={selectedItem.title} />}

                            <div className="mt-4">
                                {(() => {
                                    try {
                                        const textToCheck = selectedItem.generatedText || selectedItem.title;
                                        const cleanText = textToCheck.replace(/```json/g, '').replace(/```/g, '').trim();
                                        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                                        
                                        if (jsonMatch) {
                                            const quizData = JSON.parse(jsonMatch[0]);
                                            if (quizData && quizData.questions && Array.isArray(quizData.questions)) {
                                                return (
                                                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                                        <p className="text-sm text-muted-foreground mb-4">This is a generated quiz. Review the questions and correct answers below:</p>
                                                        {quizData.questions.map((q, idx) => (
                                                            <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                                                <p className="font-semibold text-foreground mb-3">{idx + 1}. {q.question}</p>
                                                                <div className="space-y-2 ml-4">
                                                                    {q.options.map((opt, optIdx) => (
                                                                        <div key={optIdx} className={`flex items-center gap-2 text-sm ${opt === q.correctAnswer ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                                                            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{String.fromCharCode(65 + optIdx)}</span>
                                                                            {opt} {opt === q.correctAnswer && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="mt-3 pt-3 border-t border-border/50">
                                                                    <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Explanation:</span> {q.explanation}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        }
                                    } catch (e) {
                                        console.log("Not a quiz JSON, rendering as normal text.");
                                    }
                                    return <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed animate-in fade-in duration-300">{selectedItem.generatedText}</div>;
                                })()}
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
                            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-medium hover:bg-accent hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                                <Download className="w-4 h-4" /> Download
                            </button>
                            <button onClick={() => setSelectedItem(null)} className="px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:bg-brand/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}