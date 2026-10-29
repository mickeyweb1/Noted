import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles, RotateCw, Loader2, Copy, Check, FileText, MessageCircle, Trash2,
  ChevronLeft, ChevronRight, Shuffle, Download, ThumbsUp, RefreshCcw, Trophy, Clock,
} from "lucide-react";
import api from "../utils/api";
import MathRenderer from "../components/MathRenderer";
import { scheduleReviewItems } from "../utils/spacedReview";

/* ---------- Styles ---------- */
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const toolBtn = `inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const navBtn = `inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const CARD_COUNTS = [10, 15, 20, 30];

/* ---------- Helpers ---------- */
const safeParse = (value) => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
};

const normalizeCards = (data) => {
  const list = Array.isArray(data) ? data : Array.isArray(data?.cards) ? data.cards : [];
  return list
    .map((c) => ({ front: String(c?.front ?? c?.question ?? "").trim(), back: String(c?.back ?? c?.answer ?? "").trim() }))
    .filter((c) => c.front && c.back);
};

const shuffled = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// navigator.clipboard only works on https/localhost — fall back so phone testing over http still works
const copyText = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* use fallback */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
};

export default function AiFlashcards() {
  const [inputMethod, setInputMethod] = useState("type");
  const [notesText, setNotesText] = useState("");
  const [cardCount, setCardCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const [libraryNotes, setLibraryNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");

  const [flashcards, setFlashcards] = useState([]);
  const [order, setOrder] = useState([]);       // indices into flashcards, in study order
  const [pos, setPos] = useState(0);            // position in `order` (== order.length means "round complete")
  const [isFlipped, setIsFlipped] = useState(false);
  const [statuses, setStatuses] = useState({}); // card index -> "known" | "learning"
  const [copied, setCopied] = useState(false);
  const [reviewScheduled, setReviewScheduled] = useState(false);

  const resultsRef = useRef(null);
  const flipTimerRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => () => clearTimeout(flipTimerRef.current), []);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await api.get("/ai/library");
        if (response.data.success) {
          setLibraryNotes(response.data.data.filter((item) => item.type === "flashcards" || item.type === "summary"));
        }
      } catch (err) {
        console.error("Failed to fetch library:", err);
      }
    };
    fetchLibrary();
  }, []);

  /* ---------- Deck helpers ---------- */
  const total = order.length;
  const isDone = flashcards.length > 0 && pos >= total;
  const card = !isDone ? flashcards[order[pos]] : null;
  const knownCount = Object.values(statuses).filter((s) => s === "known").length;
  const learningCount = flashcards.length - knownCount;
  const selectedNote = libraryNotes.find((n) => n._id === selectedNoteId);

  const scrollToResults = () => setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  const loadDeck = (cards) => {
    setFlashcards(cards);
    setOrder(cards.map((_, i) => i));
    setPos(0);
    setIsFlipped(false);
    setStatuses({});
  };

  // Flip back first, then swap the card, so the next answer is never visible mid-animation
  const goTo = useCallback((nextPos) => {
    const clamped = Math.max(0, Math.min(nextPos, order.length));
    clearTimeout(flipTimerRef.current);
    if (isFlipped) {
      setIsFlipped(false);
      flipTimerRef.current = setTimeout(() => setPos(clamped), 180);
    } else {
      setPos(clamped);
    }
  }, [order.length, isFlipped]);

  const toggleFlip = () => setIsFlipped((f) => !f);

  const mark = (status) => {
    if (!card) return;
    setStatuses((prev) => ({ ...prev, [order[pos]]: status }));
    goTo(pos + 1);
  };

  const shuffleDeck = () => { setOrder(shuffled(flashcards.map((_, i) => i))); setPos(0); setIsFlipped(false); };
  const restartAll = () => { setStatuses({}); setOrder(flashcards.map((_, i) => i)); setPos(0); setIsFlipped(false); };
  const reviewMissed = () => {
    const missed = flashcards.map((_, i) => i).filter((i) => statuses[i] !== "known");
    if (missed.length === 0) return;
    setOrder(missed); setPos(0); setIsFlipped(false);
  };

  /* ---------- Keyboard: ← → navigate, Space/Enter flips (when nothing else is focused) ---------- */
  useEffect(() => {
    if (flashcards.length === 0 || isDone) return;
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(pos + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(pos - 1); }
      else if ((e.key === " " || e.key === "Enter") && document.activeElement === document.body) { e.preventDefault(); toggleFlip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flashcards.length, isDone, pos, goTo]);

  /* ---------- Swipe (phones) ---------- */
  const onTouchStart = (e) => { touchStartX.current = e.changedTouches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 60) goTo(dx < 0 ? pos + 1 : pos - 1);
  };

  /* ---------- Input handlers ---------- */
  const handleLibrarySelect = (e) => {
    const noteId = e.target.value;
    setSelectedNoteId(noteId);
    setError("");
    const note = libraryNotes.find((item) => item._id === noteId);
    if (!note) return;
    if (note.type === "flashcards") {
      const cards = normalizeCards(safeParse(note.generatedText));
      if (cards.length === 0) return setError("That saved deck couldn't be opened.");
      loadDeck(cards);
      scrollToResults();
    } else {
      setNotesText(note.generatedText || note.title);
    }
  };

const handleGenerate = async () => {
  if (!notesText.trim() || isGenerating) return;
  setIsGenerating(true);
  setError("");
  setFlashcards([]);
  setOrder([]);       
    setPos(0);  
  setIsFlipped(false);
  setCopied(false);
  setReviewScheduled(false);

  try {
    const smartTitle = notesText.split("\n")[0].substring(0, 40).trim() || "Study Flashcards";
    const response = await api.post("/ai/generate", {
      text: notesText,
      mode: "flashcards",
      numCards: cardCount, // ✅ Send the selected card count
      title: smartTitle,
      subject: "General",
    });
    
    const parsedData = typeof response.data.data.generatedText === "string" 
      ? JSON.parse(response.data.data.generatedText) 
      : response.data.data.generatedText;
      
    setFlashcards(parsedData.cards || []);
  } catch (err) {
    console.error("Generation failed:", err);
    setError(
      err.response?.data?.message || "Failed to generate flashcards. Please try again."
    );
  } finally {
    setIsGenerating(false);
  }
};

  const handleCopy = async () => {
    const text = flashcards.map((c, i) => `Q${i + 1}: ${c.front}\nA${i + 1}: ${c.back}`).join("\n\n");
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleScheduleReview = async () => {
    const sourceKey = selectedNoteId || `${notesText.slice(0, 48)}-${flashcards.length}`;
    const res = await scheduleReviewItems(flashcards.map((flashcard, index) => ({
      id: `flashcard-${sourceKey}-${index}`,
      type: "flashcard",
      front: flashcard.front,
      back: flashcard.back,
      sourceTitle: selectedNote?.title || "AI flashcards",
    })));
    setReviewScheduled(Boolean(res?.saved));
  };

  const handleExport = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + ["front,back", ...flashcards.map((c) => `${esc(c.front)},${esc(c.back)}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "noted-flashcards.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setNotesText(""); setSelectedNoteId(""); setError("");
    setFlashcards([]); setOrder([]); setPos(0); setIsFlipped(false); setStatuses({});
  };

  const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;
  const progress = total ? (Math.min(pos, total) / total) * 100 : 0;

  return (
    <div className="min-h-dvh w-full bg-muted transition-colors duration-300 dark:bg-background">
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:space-y-8 md:p-8">

        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-1.5 text-sm font-semibold text-brand">
            <RotateCw className="h-4 w-4" /> AI Flashcards
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Master any topic with flashcards
          </h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            Paste your notes or pick from your library. Flip, swipe, and rate yourself until you know every card.
          </p>
        </div>

        {/* INPUT */}
        <div className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mx-auto flex w-fit rounded-lg bg-muted p-1">
            <button type="button" onClick={() => setInputMethod("type")} className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${focusRing} ${inputMethod === "type" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <FileText className="mr-2 inline h-4 w-4" /> Type notes
            </button>
            <button type="button" onClick={() => setInputMethod("library")} className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${focusRing} ${inputMethod === "library" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <MessageCircle className="mr-2 inline h-4 w-4" /> From library
            </button>
          </div>

          {inputMethod === "library" && (
            <div className="space-y-2">
              <label htmlFor="library-note" className="text-sm font-medium text-foreground">Choose a saved note or deck</label>
              <div className="relative">
                <select id="library-note" value={selectedNoteId} onChange={handleLibrarySelect} className={`flex w-full appearance-none rounded-lg border border-input bg-background p-3 pr-9 text-sm ${focusRing}`}>
                  <option value="">Choose…</option>
                  {libraryNotes.map((note) => (
                    <option key={note._id} value={note._id}>
                      {note.type === "flashcards" ? "🃏 " : "📝 "}{note.title} ({new Date(note.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
              </div>
              <p className="text-xs text-muted-foreground">🃏 Decks open for study right away. 📝 Notes are turned into a new deck.</p>
              {selectedNote && selectedNote.type !== "flashcards" && notesText && (
                <p className="line-clamp-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">{notesText}</p>
              )}
            </div>
          )}

          {inputMethod === "type" && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="notes-input" className="text-sm font-medium text-foreground">Your notes</label>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{wordCount.toLocaleString()} words</span>
                  {notesText && (
                    <button type="button" onClick={handleClear} className={`flex items-center gap-1 rounded text-destructive transition-opacity hover:opacity-80 ${focusRing}`}>
                      <Trash2 className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
              </div>
              <textarea
                id="notes-input"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={8}
                maxLength={50000}
                placeholder="Paste your notes, textbook text, or lecture summary here…"
                className={`flex w-full resize-none rounded-lg border border-input bg-background p-4 text-sm leading-relaxed placeholder:text-muted-foreground ${focusRing}`}
              />
            </div>
          )}

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Number of cards</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Number of cards">
              {CARD_COUNTS.map((n) => (
                <button key={n} type="button" aria-pressed={cardCount === n} onClick={() => setCardCount(n)} className={`min-w-[3.25rem] rounded-lg border px-3 py-2 text-sm font-semibold transition ${focusRing} ${cardCount === n ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={handleGenerate} disabled={!notesText.trim() || isGenerating} className={`${primaryBtn} h-12 w-full text-base`}>
            {isGenerating ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating flashcards…</> : <><Sparkles className="h-5 w-5" /> Generate flashcards</>}
          </button>

          {error && (
            <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </div>

        {/* RESULTS */}
        <div ref={resultsRef} className="scroll-mt-4">
          {isGenerating && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
              <div className="mx-auto flex min-h-[16rem] max-w-2xl animate-pulse flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-brand/30 bg-brand/5">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
                <p className="text-sm font-medium text-muted-foreground">Creating {cardCount} flashcards…</p>
              </div>
            </div>
          )}

          {!isGenerating && flashcards.length > 0 && (
            <div className="space-y-5 rounded-2xl border-2 border-brand/30 bg-card p-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 sm:space-y-6 sm:p-6">

              {/* Header: counter, progress, toolbar */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Your flashcards</h2>
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                      {isDone ? "Round complete" : `Card ${pos + 1} of ${total}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400"><Check className="h-3 w-3" /> {knownCount}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand"><RefreshCcw className="h-3 w-3" /> {learningCount}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(pos, total)} aria-label="Study progress">
                  <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleScheduleReview} className={toolBtn}><Clock className="h-3.5 w-3.5" /> {reviewScheduled ? "Added to spaced review" : "Review over time"}</button>
                  <button type="button" onClick={shuffleDeck} className={toolBtn}><Shuffle className="h-3.5 w-3.5" /> Shuffle</button>
                  <button type="button" onClick={handleCopy} className={toolBtn}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy all"}</button>
                  <button type="button" onClick={handleExport} className={toolBtn}><Download className="h-3.5 w-3.5" /> Export CSV</button>
                </div>
                {reviewScheduled && <p role="status" className="text-xs text-muted-foreground">These cards will come back tomorrow, then at wider intervals as you remember them.</p>}
              </div>

              {isDone ? (
                /* ----- Round summary ----- */
                <div className="mx-auto w-full max-w-2xl rounded-3xl border border-border bg-background p-6 text-center sm:p-10">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft"><Trophy className="h-8 w-8 text-brand" /></div>
                  <h3 className="text-xl font-bold text-foreground">{learningCount === 0 ? "You know them all! 🎉" : "Round complete"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {learningCount === 0 ? "Every card is marked as known." : `You know ${knownCount} of ${flashcards.length} cards. Keep going with the rest.`}
                  </p>
                  <div className="my-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-green-500/10 p-3"><p className="text-2xl font-bold text-green-700 dark:text-green-400">{knownCount}</p><p className="text-xs text-muted-foreground">Got it</p></div>
                    <div className="rounded-2xl bg-brand-soft p-3"><p className="text-2xl font-bold text-brand">{learningCount}</p><p className="text-xs text-muted-foreground">Still learning</p></div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {learningCount > 0 && (
                      <button type="button" onClick={reviewMissed} className={`${primaryBtn} h-12 w-full`}><RefreshCcw className="h-4 w-4" /> Review {learningCount} missed {learningCount === 1 ? "card" : "cards"}</button>
                    )}
                    <button type="button" onClick={restartAll} className={`${toolBtn} h-12 w-full justify-center text-sm`}><RotateCw className="h-4 w-4" /> Study all again</button>
                    <button type="button" onClick={() => { restartAll(); shuffleDeck(); }} className={`${toolBtn} h-12 w-full justify-center text-sm`}><Shuffle className="h-4 w-4" /> Shuffle &amp; restart</button>
                  </div>
                </div>
              ) : (
                /* ----- Study view ----- */
                <>
                  <div style={{ perspective: "1200px" }} className="mx-auto w-full max-w-2xl">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={isFlipped ? "Answer side. Press to show the question." : "Question side. Press to show the answer."}
                      onClick={toggleFlip}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFlip(); } }}
                      onTouchStart={onTouchStart}
                      onTouchEnd={onTouchEnd}
                      className={`grid cursor-pointer select-none rounded-3xl transition-transform duration-500 ease-in-out motion-reduce:transition-none ${focusRing}`}
                      style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                    >
                      {/* Front — both faces share one grid cell, so the card grows to fit the longer text */}
                      <div aria-hidden={isFlipped} className="flex min-h-[18rem] flex-col items-center rounded-3xl border-2 border-brand/25 bg-brand/5 p-5 text-center shadow-sm sm:min-h-[20rem] sm:p-8" style={{ gridArea: "1 / 1", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                        <span className="self-start text-[11px] font-bold uppercase tracking-wider text-brand">Question / term</span>
                        <div className="my-auto w-full break-words py-4 text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">
                          <MathRenderer>{card.front}</MathRenderer>
                        </div>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><RotateCw className="h-3 w-3" /> Tap to flip · swipe for next</p>
                      </div>

                      {/* Back */}
                      <div aria-hidden={!isFlipped} className="flex min-h-[18rem] flex-col items-center rounded-3xl border-2 border-green-500/25 bg-green-500/5 p-5 text-center shadow-sm sm:min-h-[20rem] sm:p-8" style={{ gridArea: "1 / 1", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                        <span className="self-start text-[11px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Answer / definition</span>
                        <div className="my-auto w-full break-words py-4 text-lg leading-relaxed text-foreground sm:text-xl">
                          <MathRenderer>{card.back}</MathRenderer>
                        </div>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><RotateCw className="h-3 w-3" /> Tap to flip back</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
                    <button type="button" onClick={() => goTo(pos - 1)} disabled={pos === 0} aria-label="Previous card" className={navBtn}><ChevronLeft className="h-5 w-5" /></button>
                    <button type="button" onClick={toggleFlip} className={`${primaryBtn} h-12 flex-1`}><RotateCw className="h-4 w-4" /> {isFlipped ? "Show question" : "Show answer"}</button>
                    <button type="button" onClick={() => goTo(pos + 1)} aria-label="Next card" className={navBtn}><ChevronRight className="h-5 w-5" /></button>
                  </div>

                  {/* Self-rating (unlocks after flipping) */}
                  <div className="mx-auto w-full max-w-2xl space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => mark("learning")} disabled={!isFlipped} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand-soft text-sm font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}>
                        <RefreshCcw className="h-4 w-4" /> Still learning
                      </button>
                      <button type="button" onClick={() => mark("known")} disabled={!isFlipped} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 text-sm font-semibold text-green-700 transition hover:bg-green-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-green-400 ${focusRing}`}>
                        <ThumbsUp className="h-4 w-4" /> Got it
                      </button>
                    </div>
                    {!isFlipped && <p className="text-center text-xs text-muted-foreground">Flip the card, then rate yourself.</p>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
