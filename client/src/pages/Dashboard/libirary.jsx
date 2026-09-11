import { useState, useEffect } from "react";
import { 
    Library as LibraryIcon, Search, Grid3x3, List, 
    FileText, Video, Music, Brain, FolderOpen, MoreHorizontal,
    Users, Download, X, CheckCircle2, Play, Mic, Headphones
} from "lucide-react";
import api from "../../utils/api";
import AudioPlayer from "../../components/AudioPlayer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMusic } from "../../context/MusicContext"

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-muted rounded-md ${className}`} />
);

const MarkdownContent = ({ content }) => {
  return (
    <div className="markdown-content prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-foreground mt-6 mb-4" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold text-foreground mt-5 mb-3" {...props} />,
          p: ({node, ...props}) => <p className="text-foreground leading-relaxed mb-3" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 ml-4 mb-3" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 ml-4 mb-3" {...props} />,
          li: ({node, ...props}) => <li className="text-foreground" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
          code: ({node, inline, ...props}) => inline ? <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} /> : <code className="block bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Fix #14: Safe mapping for Tailwind classes
const getIconAndColor = (type) => {
    switch (type) {
        case 'summary': return { icon: FileText, colorClass: 'bg-brand/10 text-brand' };
        case 'video': return { icon: Video, colorClass: 'bg-blue-500/10 text-blue-500' };
        case 'music': return { icon: Music, colorClass: 'bg-flame/10 text-flame' }; // Ensure 'flame' is in your tailwind config, or use 'text-red-500'
        case 'podcast': return { icon: Mic, colorClass: 'bg-purple-500/10 text-purple-500' };
        case 'quiz': return { icon: Brain, colorClass: 'bg-green-500/10 text-green-500' };
        default: return { icon: FileText, colorClass: 'bg-brand/10 text-brand' };
    }
};

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
                    const formattedData = response.data.data.map(item => {
                        const { icon, colorClass } = getIconAndColor(item.type);
                        return {
                            id: item._id,
                            type: item.type,
                            title: item.title,
                            subject: item.subject,
                            date: new Date(item.createdAt).toLocaleDateString(),
                            categoryLabel: item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Note',
                            generatedText: item.generatedText,
                            mediaUrl: item.mediaUrl,
                            icon,
                            colorClass // Store the full class string
                        };
                    });
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

  const { 
    isPlaying: isBeatPlaying, 
    currentBeat, 
    playBeat, 
    pauseBeat 
  } = useMusic();

    const filters = [
        { id: 'all', label: 'All', icon: FolderOpen },
        { id: 'summary', label: 'Summaries', icon: FileText },
        { id: 'video', label: 'Videos', icon: Video },
        { id: 'podcast', label: 'Podcasts', icon: Mic },
        { id: 'music', label: 'Music', icon: Music },
        { id: 'quiz', label: 'Quizzes', icon: Brain },
    ];

    const filteredGenerations = myGenerations.filter(item => {
        const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || (item.subject && item.subject.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    const handleDownload = () => {
        if (!selectedItem || !selectedItem.generatedText) return;
        // Basic cleanup for text download
        let cleanText = selectedItem.generatedText;
        try {
            const parsed = JSON.parse(selectedItem.generatedText);
            if (parsed.script) cleanText = parsed.script.map(s => `${s.speaker}: ${s.text}`).join('\n');
            else if (parsed.questions) cleanText = parsed.questions.map((q, i) => `${i+1}. ${q.question}\nAnswer: ${q.answer}`).join('\n\n');
        } catch (e) { /* keep raw text */ }

        const content = `TITLE: ${selectedItem.title}\nTYPE: ${selectedItem.categoryLabel}\nDATE: ${selectedItem.date}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${cleanText}`;
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
                                <div key={item.id} onClick={() => setSelectedItem(item)} className={`group relative p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-brand/30 transition-all duration-300 cursor-pointer ${viewStyle === 'list' ? 'flex items-center gap-4 hover:translate-y-0' : ''}`}>
                                    {/* Fix #14: Use safe colorClass */}
                                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${item.colorClass} mb-3 group-hover:scale-110 transition-transform duration-300 ${viewStyle === 'list' ? 'mb-0 shrink-0' : ''}`}>
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
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><FolderOpen className="w-8 h-8 text-muted-foreground" /></div>
                                <h3 className="text-lg font-semibold text-foreground">No items found</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Try adjusting your search or filters, or generate new notes!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ✅ POLISHED MODAL WITH PROPER TYPE HANDLING */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedItem(null)}>
                    <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-border animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
                            <div>
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <selectedItem.icon className={`w-5 h-5 ${selectedItem.colorClass.split(' ')[1]}`} /> 
                                    {selectedItem.title}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">{selectedItem.categoryLabel} • {selectedItem.date}</p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {/* VIDEO TYPE */}
                            {selectedItem.type === 'video' && (
                                <div className="space-y-4">
                                    {(() => {
                                        try {
                                            const videoData = JSON.parse(selectedItem.generatedText);
                                            // Fix #8: Use relative path or env var for production (simplified here to relative)
                                            const streamUrl = selectedItem.mediaUrl ? `/api/ai/video/stream/${selectedItem.mediaUrl.split(/[\\/]/).pop()}` : null;
                                            
                                            return (
                                                <div className="space-y-4">
                                                    {streamUrl && (
                                                        <div className="rounded-xl overflow-hidden border border-border bg-black">
                                                            <video src={streamUrl} controls className="w-full aspect-video" />
                                                            <a href={streamUrl} download="NotedAI_Video.mp4" className="block w-full text-center py-2 bg-brand text-brand-foreground text-sm font-bold hover:bg-brand/90">
                                                                Download Full Combined Video
                                                            </a>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {videoData.scenes?.map((scene, idx) => (
                                                            <div key={idx} className="rounded-lg overflow-hidden border border-border bg-black aspect-video relative group">
                                                                {scene.videoUrl ? (
                                                                    <video src={scene.videoUrl} className="w-full h-full object-cover" muted />
                                                                ) : scene.imageUrl ? (
                                                                    <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Generating...</div>
                                                                )}
                                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white flex items-center gap-2">
                                                                    <Play className="w-3 h-3" /> Scene {scene.sceneNumber}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        } catch (e) {
                                            return <p className="text-sm text-red-500">Error parsing video data.</p>;
                                        }
                                    })()}
                                </div>
                            )}

                            {/* PODCAST TYPE (Fix #5) */}
                            {selectedItem.type === 'podcast' && (
                                <div className="space-y-6">
                                    {(() => {
                                        try {
                                            const podcastData = JSON.parse(selectedItem.generatedText);
                                            // Extract clean text for AudioPlayer (Fix #6)
                                            const spokenText = podcastData.script.map(s => s.text).join(' ');
                                            
                                            return (
                                                <div className="space-y-6">
                                                    <AudioPlayer text={spokenText} title={selectedItem.title} />
                                                    
                                                    <div className="space-y-3">
                                                        <h3 className="font-bold text-foreground flex items-center gap-2"><Headphones className="w-4 h-4" /> Transcript</h3>
                                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                                            {podcastData.script.map((line, idx) => (
                                                                <div key={idx} className={`p-3 rounded-lg border border-border ${line.speaker === 'Leo' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-purple-500/5 border-purple-500/20'}`}>
                                                                    <p className="text-xs font-bold text-foreground mb-1">{line.speaker}</p>
                                                                    <p className="text-sm text-foreground">{line.text}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {podcastData.keyTakeaways && podcastData.keyTakeaways.length > 0 && (
                                                        <div className="p-4 rounded-xl bg-brand/5 border border-brand/20">
                                                            <h3 className="font-bold text-brand mb-2">Key Takeaways</h3>
                                                            <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                                                                {podcastData.keyTakeaways.map((item, idx) => <li key={idx}>{item}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } catch (e) {
                                            return <p className="text-sm text-red-500">Error parsing podcast data.</p>;
                                        }
                                    })()}
                                </div>
                            )}

                            {/* QUIZ TYPE (Fix #6) */}
                            {selectedItem.type === 'quiz' && (
                                <div className="space-y-4">
                                    {(() => {
                                        try {
                                            const quizData = JSON.parse(selectedItem.generatedText);
                                            if (quizData.questions) {
                                                return (
                                                    <div className="space-y-4">
                                                        <p className="text-sm text-muted-foreground">Review the questions and correct answers below:</p>
                                                        {quizData.questions.map((q, idx) => (
                                                            <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border">
                                                                <p className="font-semibold text-foreground mb-3">{idx + 1}. {q.question}</p>
                                                                <div className="space-y-2 ml-4">
                                                                    {q.options.map((opt, optIdx) => (
                                                                        <div key={optIdx} className={`flex items-center gap-2 text-sm ${opt === q.answer ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                                                            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{String.fromCharCode(65 + optIdx)}</span>
                                                                            {opt} {opt === q.answer && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {q.explanation && (
                                                                    <div className="mt-3 pt-3 border-t border-border/50">
                                                                        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Explanation:</span> {q.explanation}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        } catch (e) {
                                            console.error("Quiz parse error", e);
                                        }
                                        return <p className="text-sm text-red-500">Could not load quiz data.</p>;
                                    })()}
                                </div>
                            )}

{/* DEFAULT (Summary/Music/Text) */}
{!['video', 'podcast', 'quiz'].includes(selectedItem.type) && (
    <div className="mt-4 space-y-4">
        {selectedItem.type === 'music' && (
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Music className="w-4 h-4 text-purple-500" /> Background Beat
                </h3>
                <div className="flex items-center gap-3">
                    <select 
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                        onChange={(e) => {
                            const beat = FREE_BEATS.find(b => b.id === e.target.value);
                            if (beat) {
                                if (isBeatPlaying) pauseBeat();
                                playBeat(beat);
                            }
                        }}
                    >
                        <option value="">Select a beat to play...</option>
                        {FREE_BEATS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <button 
                        onClick={() => {
                            if (isBeatPlaying) {
                                pauseBeat();
                            } else if (currentBeat) {
                                playBeat(currentBeat);
                            }
                        }}
                        disabled={!currentBeat}
                        className={`p-3 rounded-full transition-colors ${isBeatPlaying ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground hover:bg-purple-500/10 hover:text-purple-500'} disabled:opacity-50`}
                    >
                        {isBeatPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
                    </button>
                </div>
            </div>
        )}
        
        {selectedItem.type === 'music' && selectedItem.generatedText && (
            <AudioPlayer text={selectedItem.generatedText} title={selectedItem.title} style="rap" />
        )}
        <div className="mt-4">
            <MarkdownContent content={selectedItem.generatedText} />
        </div>
    </div>
)}
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