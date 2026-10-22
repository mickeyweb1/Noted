import { useState, useEffect, useCallback } from "react";
import {
  Library as LibraryIcon, Search, Grid3x3, List,
  FileText, Video, Music, Brain, FolderOpen,
  Users, Download, X, CheckCircle2, Play, Pause, Mic, Headphones, Trash2, Lock, RotateCw, AlertTriangle, Loader2,
} from "lucide-react";
import api from "../../utils/api";
import AudioPlayer from "../../components/AudioPlayer";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { useMusic } from "../../context/MusicContext";

// Math rendering for equations in notes
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const FREE_BEATS = [
  { id: "beat_1", name: "Upbeat Hip-Hop Loop", url: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3" },
  { id: "beat_2", name: "Chill Lo-Fi Study", url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { id: "beat_3", name: "Afrobeat Groove", url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3" },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/* ---------- Helpers ---------- */
const safeParse = (value) => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
};

const getIconAndColor = (type) => {
  switch (type) {
    case "summary": return { icon: FileText, colorClass: "bg-brand-soft text-brand" };
    case "video": return { icon: Video, colorClass: "bg-blue-500/10 text-blue-500" };
    case "music": return { icon: Music, colorClass: "bg-purple-500/10 text-purple-500" };
    case "podcast": return { icon: Mic, colorClass: "bg-indigo-500/10 text-indigo-500" };
    case "flashcards": return { icon: RotateCw, colorClass: "bg-orange-500/10 text-orange-500" };
    case "quiz": return { icon: Brain, colorClass: "bg-green-500/10 text-green-500" };
    default: return { icon: FileText, colorClass: "bg-brand-soft text-brand" };
  }
};

// Built from the axios base URL so it works in dev and production (a bare "/api/..." hits the Vite server)
const buildStreamUrl = (mediaUrl) => {
  if (!mediaUrl) return null;
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  return `${base}/ai/video/stream/${mediaUrl.split(/[\\/]/).pop()}`;
};

const Skeleton = ({ className }) => <div className={`animate-pulse rounded-md bg-muted ${className}`} />;

/* ---------- Content renderers ---------- */
const MarkdownContent = ({ content }) => {
  let displayContent = content || "";
  const parsed = safeParse(content);
  if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.script)) displayContent = parsed.script.map((s) => `**${s.speaker}**: ${s.text}`).join("\n\n");
    else if (Array.isArray(parsed.questions)) displayContent = parsed.questions.map((q, i) => `**${i + 1}. ${q.question}**\nAnswer: ${q.answer || q.correctAnswer}\n${q.explanation ? "Explanation: " + q.explanation : ""}`).join("\n\n");
  }

  return (
    // overflow-wrap:anywhere breaks long words/URLs; katex-display scrolls sideways instead of pushing the page wide
    <div className="markdown-content prose prose-sm dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => <h1 className="mb-4 mt-6 text-xl font-bold text-foreground sm:text-2xl" {...props} />,
          h2: ({ node, ...props }) => <h2 className="mb-3 mt-5 text-lg font-bold text-foreground sm:text-xl" {...props} />,
          h3: ({ node, ...props }) => <h3 className="mb-2 mt-4 text-base font-semibold text-foreground" {...props} />,
          p: ({ node, ...props }) => <p className="mb-3 leading-relaxed text-foreground" {...props} />,
          ul: ({ node, ...props }) => <ul className="mb-3 ml-4 list-disc space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="mb-3 ml-4 list-decimal space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="text-foreground" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
          a: ({ node, ...props }) => <a className="break-all text-brand underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
          table: ({ node, ...props }) => <div className="my-3 overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm" {...props} /></div>,
          th: ({ node, ...props }) => <th className="border-b border-border bg-muted/50 px-3 py-2 text-left font-semibold" {...props} />,
          td: ({ node, ...props }) => <td className="border-b border-border px-3 py-2" {...props} />,
          pre: ({ node, ...props }) => <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-3 text-sm" {...props} />,
          code: ({ node, inline, className, children, ...props }) => {
            // react-markdown v8 passes `inline`; v9 doesn't — so also detect block code by language class / newline
            const isBlock = inline === false || /language-/.test(className || "") || String(children).includes("\n");
            return isBlock
              ? <code className="font-mono text-sm" {...props}>{children}</code>
              : <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props}>{children}</code>;
          },
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
};

// Lyrics keep their line breaks (Markdown would squash them into one paragraph)
const Lyrics = ({ text }) => (
  <div className="space-y-1 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed">
    {String(text || "").split("\n").map((line, i) =>
      /^\s*\[.*\]\s*$/.test(line) ? (
        <p key={i} className="pt-3 text-xs font-bold uppercase tracking-wider text-purple-500 first:pt-0">{line.replace(/[[\]]/g, "")}</p>
      ) : line.trim() ? (
        <p key={i} className="break-words text-foreground">{line}</p>
      ) : null
    )}
  </div>
);

/* ---------- Page ---------- */
export default function StudentLibrary() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("my-library");
  const [viewStyle, setViewStyle] = useState("grid");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [myGenerations, setMyGenerations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const { isPlaying: isBeatPlaying, currentBeat, playBeat, pauseBeat, resumeBeat } = useMusic();

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await api.get("/ai/library");
      if (response.data.success) {
        setMyGenerations(response.data.data.map((item) => {
          const { icon, colorClass } = getIconAndColor(item.type);
          return {
            id: item._id,
            type: item.type,
            title: item.title || "Untitled",
            subject: item.subject,
            date: new Date(item.createdAt).toLocaleDateString(),
            categoryLabel: item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "Note",
            generatedText: item.generatedText,
            mediaUrl: item.mediaUrl,
            icon,
            colorClass,
          };
        }));
      }
    } catch (error) {
      console.error("Failed to fetch library:", error);
      setLoadError("We couldn't load your library. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const closeModal = () => {
    if (selectedItem?.type === "music" && isBeatPlaying) pauseBeat(); // don't leave a beat playing with no controls
    setSelectedItem(null);
  };

  // Escape closes the top-most dialog; page behind doesn't scroll while a dialog is open
  useEffect(() => {
    if (!selectedItem && !confirmDelete) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirmDelete) setConfirmDelete(null);
      else closeModal();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedItem, confirmDelete, isBeatPlaying]);

  const filters = [
    { id: "all", label: "All", icon: FolderOpen },
    { id: "summary", label: "Summaries", icon: FileText },
    { id: "video", label: "Videos", icon: Video },
    { id: "flashcards", label: "Flashcards", icon: RotateCw },
    { id: "podcast", label: "Podcasts", icon: Mic },
    { id: "music", label: "Music", icon: Music },
    { id: "quiz", label: "Quizzes", icon: Brain },
  ];

  const counts = myGenerations.reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), { all: myGenerations.length });

  const filteredGenerations = myGenerations.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesFilter = activeFilter === "all" || item.type === activeFilter;
    const matchesSearch = item.title.toLowerCase().includes(q) || (item.subject && item.subject.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const requestDelete = (item, e) => {
    e.stopPropagation();
    setDeleteError("");
    setConfirmDelete(item);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      // matches aiRoute: DELETE /api/ai/:id
      await api.delete(`/ai/${confirmDelete.id}`);
      setMyGenerations((prev) => prev.filter((item) => item.id !== confirmDelete.id));
      if (selectedItem?.id === confirmDelete.id) setSelectedItem(null);
      setConfirmDelete(null);
    } catch (error) {
      console.error("Failed to delete item:", error);
      setDeleteError("Couldn't delete this item. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    if (!selectedItem || !selectedItem.generatedText) return;
    let cleanText = selectedItem.generatedText;
    const parsed = safeParse(selectedItem.generatedText);
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.script)) cleanText = parsed.script.map((s) => `${s.speaker}: ${s.text}`).join("\n");
      else if (Array.isArray(parsed.questions)) cleanText = parsed.questions.map((q, i) => `${i + 1}. ${q.question}\nAnswer: ${q.answer || q.correctAnswer}`).join("\n\n");
      else if (Array.isArray(parsed.cards)) cleanText = parsed.cards.map((c, i) => `Card ${i + 1}\nQ: ${c.front}\nA: ${c.back}`).join("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
    }

    const content = `TITLE: ${selectedItem.title}\nTYPE: ${selectedItem.categoryLabel}\nDATE: ${selectedItem.date}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${cleanText}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedItem.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ---------- Modal body per content type ---------- */
  const renderModalBody = (item) => {
    if (item.type === "video") {
      const videoData = safeParse(item.generatedText);
      if (!videoData) return <p className="text-sm text-destructive">Error parsing video data.</p>;
      const streamUrl = buildStreamUrl(item.mediaUrl);
      return (
        <div className="space-y-4">
          {streamUrl && (
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              <video src={streamUrl} controls playsInline className="aspect-video w-full" />
              <a href={streamUrl} download="NotedAI_Video.mp4" className="block w-full bg-brand py-2.5 text-center text-sm font-bold text-brand-foreground hover:bg-brand/90">
                Download full video
              </a>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {videoData.scenes?.map((scene, idx) => (
              <div key={idx} className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
                {scene.videoUrl ? (
                  <video src={scene.videoUrl} className="h-full w-full object-cover" muted playsInline />
                ) : scene.imageUrl ? (
                  <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Not available</div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/60 p-2 text-xs text-white">
                  <Play className="h-3 w-3 shrink-0" /> <span className="truncate">Scene {scene.sceneNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (item.type === "podcast") {
      const podcastData = safeParse(item.generatedText);
      if (!podcastData || !Array.isArray(podcastData.script)) return <p className="text-sm text-destructive">Error parsing podcast data.</p>;
      const spokenText = podcastData.script.map((s) => s.text).join(" ");
      return (
        <div className="space-y-6">
          <AudioPlayer text={spokenText} title={item.title} />
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-bold text-foreground"><Headphones className="h-4 w-4" /> Transcript</h3>
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {podcastData.script.map((line, idx) => (
                <div key={idx} className={`rounded-lg border p-3 ${line.speaker === "Leo" ? "border-blue-500/20 bg-blue-500/5" : "border-purple-500/20 bg-purple-500/5"}`}>
                  <p className="mb-1 text-xs font-bold text-foreground">{line.speaker}</p>
                  <p className="break-words text-sm text-foreground">{line.text}</p>
                </div>
              ))}
            </div>
          </div>
          {podcastData.keyTakeaways?.length > 0 && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
              <h3 className="mb-2 font-bold text-brand">Key takeaways</h3>
              <ul className="ml-4 list-disc space-y-1 break-words text-sm text-foreground">
                {podcastData.keyTakeaways.map((t, idx) => <li key={idx}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (item.type === "flashcards") {
      const deck = safeParse(item.generatedText);
      const cards = Array.isArray(deck?.cards) ? deck.cards : [];
      if (cards.length === 0) return <p className="text-sm text-destructive">Couldn't read this deck.</p>;
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => navigate("/ai-flashcards", { state: { deck: cards } })}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-orange-600 ${focusRing}`}
          >
            <RotateCw className="h-5 w-5" /> Study {cards.length} cards now
          </button>
          <ul className="space-y-2">
            {cards.map((c, i) => (
              <li key={i} className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="break-words text-sm font-semibold text-foreground"><span className="mr-1.5 text-orange-500">Q{i + 1}.</span>{c.front}</p>
                <p className="mt-1 break-words text-sm text-muted-foreground"><span className="mr-1.5 font-semibold text-green-600 dark:text-green-400">A.</span>{c.back}</p>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (item.type === "quiz") {
      const quizData = safeParse(item.generatedText);
      if (!quizData || !Array.isArray(quizData.questions)) return <p className="text-sm text-destructive">Could not load quiz data.</p>;
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Review the questions and correct answers below:</p>
          {quizData.questions.map((q, idx) => {
            const correct = q.answer || q.correctAnswer;
            return (
              <div key={idx} className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-3 break-words font-semibold text-foreground">{idx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options?.map((opt, optIdx) => (
                    <div key={optIdx} className={`flex items-start gap-2 text-sm ${opt === correct ? "font-medium text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">{String.fromCharCode(65 + optIdx)}</span>
                      <span className="min-w-0 flex-1 break-words">{opt}</span>
                      {opt === correct && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className="mt-3 border-t border-border/50 pt-3">
                    <p className="break-words text-xs text-muted-foreground"><span className="font-semibold text-foreground">Explanation:</span> {q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // summary / tutor / music
    return (
      <div className="space-y-4">
        {item.type === "music" && (
          <>
            <div className="space-y-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <h3 className="flex items-center gap-2 font-bold text-foreground"><Music className="h-4 w-4 text-purple-500" /> Background beat</h3>
              <div className="flex items-center gap-3">
                <select
                  value={currentBeat?.id || ""}
                  className={`min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm ${focusRing}`}
                  onChange={(e) => {
                    const beat = FREE_BEATS.find((b) => b.id === e.target.value);
                    if (beat) playBeat(beat);
                  }}
                >
                  <option value="">Select a beat…</option>
                  {FREE_BEATS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <button
                  type="button"
                  aria-label={isBeatPlaying ? "Pause beat" : "Play beat"}
                  onClick={() => { if (isBeatPlaying) pauseBeat(); else if (currentBeat) resumeBeat(); }}
                  disabled={!currentBeat}
                  className={`shrink-0 rounded-full p-3 transition-colors disabled:opacity-50 ${focusRing} ${isBeatPlaying ? "bg-purple-500 text-white" : "bg-muted text-muted-foreground hover:bg-purple-500/10 hover:text-purple-500"}`}
                >
                  {isBeatPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
                </button>
              </div>
            </div>
            {item.generatedText && <AudioPlayer text={item.generatedText} title={item.title} style="rap" />}
          </>
        )}
        {item.type === "music" ? <Lyrics text={item.generatedText} /> : <MarkdownContent content={item.generatedText} />}
      </div>
    );
  };

  return (
    <div className="min-h-dvh w-full bg-muted transition-colors duration-300 dark:bg-background">
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="min-w-0">
            <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              <LibraryIcon className="h-7 w-7 shrink-0 text-brand md:h-8 md:w-8" /> Library
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Your personal archive and community study materials.</p>
          </div>
          <div className="flex w-fit rounded-xl border border-border bg-card p-1 shadow-sm">
            <button type="button" onClick={() => setActiveTab("my-library")} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${focusRing} ${activeTab === "my-library" ? "bg-brand text-brand-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>My Library</button>
            <button type="button" onClick={() => setActiveTab("discover")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${focusRing} ${activeTab === "discover" ? "bg-electric text-electric-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}><Users className="h-4 w-4" /> Discover</button>
          </div>
        </div>

        {activeTab === "my-library" && (
          <>
            {/* Search + filters */}
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your library…"
                  aria-label="Search your library"
                  className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-base text-foreground placeholder:text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 [&::-webkit-search-cancel-button]:hidden"
                />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear search" className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted ${focusRing}`}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setActiveFilter(filter.id)}
                      aria-pressed={activeFilter === filter.id}
                      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${focusRing} ${activeFilter === filter.id ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
                    >
                      <filter.icon className="h-3.5 w-3.5" />{filter.label}
                      {counts[filter.id] > 0 && <span className={`rounded-full px-1.5 text-[10px] font-semibold ${activeFilter === filter.id ? "bg-background/20" : "bg-muted"}`}>{counts[filter.id]}</span>}
                    </button>
                  ))}
                </div>
                <div className="hidden shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1 md:flex">
                  <button type="button" aria-label="Grid view" onClick={() => setViewStyle("grid")} className={`rounded-md p-1.5 transition-all ${focusRing} ${viewStyle === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Grid3x3 className="h-4 w-4" /></button>
                  <button type="button" aria-label="List view" onClick={() => setViewStyle("list")} className={`rounded-md p-1.5 transition-all ${focusRing} ${viewStyle === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><List className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            {loadError && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loadError}</span>
                <button type="button" onClick={fetchLibrary} className={`rounded-lg border border-destructive/30 px-3 py-1.5 font-medium hover:bg-destructive/10 ${focusRing}`}>Try again</button>
              </div>
            )}

            {/* Items */}
            <div className={viewStyle === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-3"}>
              {isLoading ? (
                <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                filteredGenerations.map((item) => (
                  <div key={item.id} className="group relative min-w-0 rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-brand/30 hover:shadow-md">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className={`flex w-full min-w-0 gap-4 rounded-2xl p-4 text-left ${focusRing} ${viewStyle === "list" ? "flex-row items-center pr-14" : "flex-col items-start"}`}
                    >
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${item.colorClass}`}>
                        <item.icon className="h-6 w-6" />
                      </span>
                      <span className="block min-w-0 flex-1">
                        <span className="line-clamp-2 block break-words text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-brand" title={item.title}>{item.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">{item.categoryLabel}</span><span aria-hidden="true">•</span><span>{item.date}</span>
                        </span>
                      </span>
                    </button>
                    {/* Always visible on touch screens; hover-reveal only on desktop */}
                    <button
                      type="button"
                      onClick={(e) => requestDelete(item, e)}
                      aria-label={`Delete ${item.title}`}
                      className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 ${focusRing}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}

              {!isLoading && !loadError && filteredGenerations.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><FolderOpen className="h-8 w-8 text-muted-foreground" /></div>
                  <h3 className="text-lg font-semibold text-foreground">{myGenerations.length === 0 ? "Your library is empty" : "No items found"}</h3>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    {myGenerations.length === 0 ? "Generate summaries, quizzes, podcasts and more — they'll be saved here." : "Try a different search or filter."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "discover" && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-300 sm:py-20">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted"><Lock className="h-10 w-10 text-muted-foreground" /></div>
            <h3 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">Community Library coming soon</h3>
            <p className="mb-6 max-w-md text-sm text-muted-foreground sm:text-base">
              We're building a secure space where you can discover and share study materials with your classmates. It's temporarily unavailable — stay tuned!
            </p>
            <button type="button" onClick={() => setActiveTab("my-library")} className={`flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 font-medium text-brand-foreground transition-all hover:bg-brand/90 ${focusRing}`}>
              <FolderOpen className="h-4 w-4" /> Back to My Library
            </button>
          </div>
        )}
      </div>

      {/* ITEM MODAL — bottom sheet on phones, centered card on larger screens */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4" onClick={closeModal}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="library-modal-title"
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl animate-in slide-in-from-bottom-8 duration-300 sm:max-h-[85dvh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-muted/30 p-4 sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedItem.colorClass}`}>
                  <selectedItem.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="library-modal-title" className="line-clamp-3 break-words text-lg font-bold leading-snug text-foreground sm:text-xl">{selectedItem.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{selectedItem.categoryLabel} • {selectedItem.date}</p>
                </div>
              </div>
              <button type="button" onClick={closeModal} aria-label="Close" className={`shrink-0 rounded-lg p-2 transition-colors hover:bg-muted ${focusRing}`}><X className="h-5 w-5" /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {renderModalBody(selectedItem)}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={handleDownload} className={`flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent active:scale-[0.98] ${focusRing}`}>
                <Download className="h-4 w-4" /> Download
              </button>
              <button type="button" onClick={closeModal} className={`rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground transition-all hover:bg-brand/90 active:scale-[0.98] ${focusRing}`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={() => !isDeleting && setConfirmDelete(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-title" className="mb-1 text-lg font-bold text-foreground">Delete this item?</h3>
            <p className="mb-1 line-clamp-2 break-words text-sm font-medium text-foreground">{confirmDelete.title}</p>
            <p className="mb-4 text-sm text-muted-foreground">This can't be undone.</p>
            {deleteError && <p role="alert" className="mb-3 text-sm text-destructive">{deleteError}</p>}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button type="button" onClick={handleDelete} disabled={isDeleting} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-white transition hover:bg-destructive/90 disabled:opacity-60 ${focusRing}`}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(null)} disabled={isDeleting} className={`flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-accent ${focusRing}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
