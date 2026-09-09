import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera, Check, Clipboard, Download, FileText, GraduationCap,
  Headphones, Loader2, MessageCircle, Mic, Pause, Play, Sparkles,
  Square, User, Brain
} from "lucide-react";
import api from "../utils/api";
import NoteScanner from "../components/NoteScanner";

const SPEEDS = [0.75, 1, 1.25, 1.5];
const TONES = ["Funny", "Calm", "Energetic", "Serious"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const removeCodeFence = (value) => value.replace(/`json/gi, "").replace(/`/g, "").trim();

const parsePodcastResponse = (generatedText) => {
  if (generatedText && typeof generatedText === "object") return generatedText;
  if (typeof generatedText !== "string") throw new Error("The podcast response was empty.");
  
  const cleanText = removeCodeFence(generatedText);
  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? cleanText.slice(firstBrace, lastBrace + 1) : cleanText;
  
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed.title !== "string" || !Array.isArray(parsed.script) || parsed.script.length === 0) {
    throw new Error("The podcast response was not in the correct format.");
  }
  
  const script = parsed.script
    .filter((line) => line && typeof line.text === "string" && line.text.trim().length > 0)
    .map((line) => ({
      speaker: line.speaker?.toLowerCase() === "leo" ? "Leo" : "Dr. Nova",
      text: line.text.trim(),
    }));
    
  if (script.length === 0) throw new Error("The podcast did not contain any dialogue.");
  
  return {
    title: parsed.title.trim(),
    script,
    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
    quiz: Array.isArray(parsed.quiz) ? parsed.quiz : [],
  };
};

export default function PodcastGenerator() {
  const [inputMethod, setInputMethod] = useState("type");
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState("short");
  const [tone, setTone] = useState("Funny");
  const [level, setLevel] = useState("Beginner");
  
  const [script, setScript] = useState([]);
  const [keyTakeaways, setKeyTakeaways] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [podcastTitle, setPodcastTitle] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [voices, setVoices] = useState([]);
  
  const [libraryNotes, setLibraryNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [copied, setCopied] = useState(false);
  const [studioAudioUrl, setStudioAudioUrl] = useState("");
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const speechRunId = useRef(0);
  const currentIndexRef = useRef(0);
  const scriptRef = useRef([]);
  const playbackSpeedRef = useRef(1);

  useEffect(() => { scriptRef.current = script; }, [script]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLibrary = async () => {
      try {
        const response = await api.get("/ai/library", { signal: controller.signal });
        if (response.data?.success) {
          const notes = response.data.data.filter((item) => item.type === "summary" || item.type === "tutor");
          setLibraryNotes(notes);
        }
      } catch (requestError) {
        if (requestError.name !== "CanceledError") console.error("Failed to fetch library:", requestError);
      }
    };
    fetchLibrary();
    return () => controller.abort();
  }, []);

  const stopAudio = useCallback(() => {
    speechRunId.current += 1;
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
  }, []);

  useEffect(() => {
    return () => {
      speechRunId.current += 1;
      window.speechSynthesis?.cancel();
      if (studioAudioUrl) URL.revokeObjectURL(studioAudioUrl);
    };
  }, [studioAudioUrl]);

  const chooseVoices = () => {
    const allVoices = window.speechSynthesis.getVoices();
    
    // ✅ FIX: Strict priority via separate .find() calls
    const leoVoice = allVoices.find(v => /Daniel|Alex/i.test(v.name)) 
                  || allVoices.find(v => /Google US English/i.test(v.name)) 
                  || allVoices[0];
                  
    const novaVoice = allVoices.find(v => /Samantha|Karen/i.test(v.name)) 
                   || allVoices.find(v => /Google UK English Female/i.test(v.name) && v !== leoVoice) 
                   || allVoices.find(v => v !== leoVoice) 
                   || allVoices[0];
                   
    return { leoVoice, novaVoice };
  };

  const speakCurrentLine = useCallback((runId) => {
    const activeScript = scriptRef.current;
    const currentIndex = currentIndexRef.current;
    if (runId !== speechRunId.current || currentIndex >= activeScript.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
      return;
    }
    const line = activeScript[currentIndex];
    const { leoVoice, novaVoice } = chooseVoices();
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.voice = line.speaker.toLowerCase() === "leo" ? leoVoice : novaVoice;
    utterance.rate = playbackSpeedRef.current;
    utterance.pitch = line.speaker.toLowerCase() === "leo" ? 1.08 : 0.92;
    setCurrentLineIndex(currentIndex);
    
    utterance.onend = () => {
      if (runId !== speechRunId.current) return;
      currentIndexRef.current += 1;
      // ✅ Fix #13: Tiny delay prevents Chrome speech synthesis halting bug
      setTimeout(() => speakCurrentLine(runId), 100);
    };
    utterance.onerror = () => {
      if (runId !== speechRunId.current) return;
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
      setError("Audio playback failed. Please try again.");
    };
    window.speechSynthesis.speak(utterance);
  }, [voices]);

  const startAudio = () => {
    if (!window.speechSynthesis || scriptRef.current.length === 0) {
      setError("Audio playback is not supported in this browser.");
      return;
    }
    speechRunId.current += 1;
    const runId = speechRunId.current;
    currentIndexRef.current = 0;
    window.speechSynthesis.cancel();
    setError("");
    setIsPlaying(true);
    setIsPaused(false);
    speakCurrentLine(runId);
  };

  const toggleAudio = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
      return;
    }
    startAudio();
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (isPlaying && !isPaused) {
      const runId = ++speechRunId.current;
      window.speechSynthesis.cancel();
      setIsPlaying(true);
      speakCurrentLine(runId);
    }
  };

  const handleLibrarySelect = (event) => {
    const noteId = event.target.value;
    setSelectedNoteId(noteId);
    const note = libraryNotes.find((item) => item._id === noteId);
    if (note) setTopic((note.generatedText || note.title).slice(0, 50000));
  };

  const handleGenerate = async () => {
    const cleanTopic = topic.trim();
    if (cleanTopic.length < 5) {
      setError("Add at least 5 characters of notes or a topic.");
      return;
    }
    if (cleanTopic.length > 50000) {
      setError("Your notes are too long. Please use fewer notes.");
      return;
    }
    stopAudio();
    setIsLoading(true);
    setError("");
    setNotice("");
    setScript([]);
    setKeyTakeaways([]);
    setQuiz([]);
    setPodcastTitle("");
    setStudioAudioUrl("");
    
    try {
      const response = await api.post("/ai/generate", {
        text: cleanTopic,
        mode: "podcast",
        length,
        tone,
        level,
        subject: "General",
      });
      const generatedText = response.data?.data?.generatedText;
      const podcast = parsePodcastResponse(generatedText);
      
      setPodcastTitle(podcast.title);
      setScript(podcast.script);
      setKeyTakeaways(podcast.keyTakeaways);
      setQuiz(podcast.quiz);
      setNotice("Your study podcast is ready.");
    } catch (requestError) {
      console.error("Generation failed:", requestError);
      setError(requestError.response?.data?.message || requestError.message || "Failed to generate podcast. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const transcriptText = script.map((line) => `${line.speaker}: ${line.text}`).join("\n\n");

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the transcript.");
    }
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcriptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${podcastTitle || "study-podcast"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateStudioAudio = async () => {
    if (!transcriptText || isAudioLoading) return;
    setIsAudioLoading(true);
    setError("");
    try {
      const response = await api.post("/ai/text-to-speech", { text: transcriptText, style: "podcast" }, { responseType: "blob" });
      const nextAudioUrl = URL.createObjectURL(response.data);
      setStudioAudioUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return nextAudioUrl;
      });
      setNotice("Studio audio is ready.");
    } catch (requestError) {
      console.error("Studio audio failed:", requestError);
      setError(requestError.response?.data?.message || "Studio audio could not be created. Browser playback is still available.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-muted transition-colors duration-300 dark:bg-background">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <header className="space-y-2 text-center">
          <h1 className="flex items-center justify-center gap-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            <Mic className="h-8 w-8 text-brand" /> AI Study Podcast
          </h1>
          <p className="text-base text-muted-foreground md:text-lg">
            Turn your notes into a natural conversation you can listen to, pause, replay, and study from.
          </p>
          {/* ✅ TRUSTWORTHY DISCLAIMER */}
          <p className="text-xs text-muted-foreground italic bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 py-1 px-3 rounded-full inline-block">
            ⚠️ AI-generated content — review important facts before using for exams.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mx-auto flex w-fit max-w-full overflow-x-auto rounded-lg bg-muted p-1 md:mx-0" role="tablist">
            <button type="button" onClick={() => { setInputMethod("type"); setSelectedNoteId(""); }} className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${inputMethod === "type" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <FileText className="mr-2 inline h-4 w-4" /> Type Topic
            </button>
            <button type="button" onClick={() => setInputMethod("scan")} className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${inputMethod === "scan" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <Camera className="mr-2 inline h-4 w-4" /> Scan Notes
            </button>
            <button type="button" onClick={() => setInputMethod("library")} className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${inputMethod === "library" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <MessageCircle className="mr-2 inline h-4 w-4" /> From Library
            </button>
          </div>

          {inputMethod === "scan" && <NoteScanner onScanComplete={(text) => setTopic(text)} />}
          
          {inputMethod === "library" && (
            <div className="space-y-2">
              <label htmlFor="saved-note" className="text-sm font-medium text-foreground">Select a saved note</label>
              <select id="saved-note" value={selectedNoteId} onChange={handleLibrarySelect} className="flex w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                <option value="">Choose a note</option>
                {libraryNotes.map((note) => (<option key={note._id} value={note._id}>{note.title} ({new Date(note.createdAt).toLocaleDateString()})</option>))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="podcast-topic" className="text-sm font-medium text-foreground">{inputMethod === "type" ? "What should they discuss?" : "Review or edit your notes"}</label>
            <textarea id="podcast-topic" value={topic} onChange={(event) => setTopic(event.target.value)} rows={inputMethod === "scan" ? 7 : 5} maxLength={50000} placeholder="Example: The water cycle, black holes, or photosynthesis..." className="flex w-full resize-none rounded-lg border border-input bg-background p-4 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand" />
            <div className="flex justify-end text-xs text-muted-foreground">{topic.length.toLocaleString()} / 50,000</div>
          </div>

          {/* ✅ TONE & LEVEL SELECTORS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Tone</span>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button key={t} type="button" onClick={() => setTone(t)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${tone === t ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Study Level</span>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button key={l} type="button" onClick={() => setLevel(l)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${level === l ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Podcast length</span>
            <div className="grid grid-cols-3 gap-2">
              {["short", "medium", "long"].map((option) => (
                <button type="button" key={option} onClick={() => setLength(option)} className={`rounded-lg border py-2 text-sm font-medium transition-all ${length === option ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent"}`}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                  <span className="block text-[10px] opacity-80">{option === "short" ? "~3-5 mins" : option === "medium" ? "~5-8 mins" : "~10-12 mins"}</span>
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={handleGenerate} disabled={topic.trim().length < 5 || isLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-base font-semibold text-brand-foreground shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
            {isLoading ? (<><Loader2 className="h-5 w-5 animate-spin" /> Writing your podcast...</>) : (<><Sparkles className="h-5 w-5" /> Generate Podcast</>)}
          </button>
          
          {error && (<div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-500">{error}</div>)}
        </section>

        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-4 py-12 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <p className="text-sm font-medium">Planning the conversation and writing the script...</p>
          </div>
        )}

        {!isLoading && script.length > 0 && (
          <section className="animate-in space-y-6 fade-in slide-in-from-bottom-4 duration-500">
            {notice && (<div className="rounded-xl border border-brand/20 bg-brand/10 p-3 text-center text-sm text-brand">{notice}</div>)}
            
            <div className="sticky top-4 z-10 flex flex-col gap-4 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand/10 to-brand/5 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-foreground">{podcastTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Featuring Leo and Dr. Nova {currentLineIndex >= 0 ? ` · Line ${currentLineIndex + 1} of ${script.length}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg border border-border bg-background p-1">
                  {SPEEDS.map((speed) => (
                    <button type="button" key={speed} onClick={() => changeSpeed(speed)} className={`rounded px-2 py-1 text-xs font-bold transition-all ${playbackSpeed === speed ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label={`Set playback speed to ${speed} times`}>
                      {speed}x
                    </button>
                  ))}
                </div>
                <button type="button" onClick={toggleAudio} className="rounded-full bg-brand p-3 text-brand-foreground shadow-lg transition-all hover:bg-brand/90" aria-label={isPaused ? "Resume podcast" : isPlaying ? "Pause podcast" : "Play podcast"}>
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                {(isPlaying || isPaused) && (
                  <button type="button" onClick={stopAudio} className="rounded-full border border-border bg-background p-3 text-muted-foreground transition hover:text-foreground" aria-label="Stop podcast">
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={generateStudioAudio} disabled={isAudioLoading} className="inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-medium text-brand transition hover:bg-brand/20 disabled:opacity-60">
                {isAudioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headphones className="h-4 w-4" />}
                {isAudioLoading ? "Creating audio..." : "Create studio audio"}
              </button>
              <button type="button" onClick={copyTranscript} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy transcript"}
              </button>
              <button type="button" onClick={downloadTranscript} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground">
                <Download className="h-4 w-4" /> Download
              </button>
            </div>

            {studioAudioUrl && (
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                <p className="mb-2 text-sm font-semibold text-foreground">Studio narration</p>
                <audio controls preload="metadata" src={studioAudioUrl} className="w-full">Your browser does not support audio playback.</audio>
              </div>
            )}

            {/* ✅ KEY TAKEAWAYS SECTION */}
            {keyTakeaways.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground mb-3">
                  <Sparkles className="h-5 w-5 text-brand" /> Key Takeaways
                </h3>
                <ul className="space-y-2">
                  {keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ✅ TEST ME (QUIZ) SECTION */}
            {quiz.length > 0 && (
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                  <Brain className="h-5 w-5 text-brand" /> Test Yourself
                </h3>
                <div className="space-y-6">
                  {quiz.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-3 rounded-lg bg-background p-4 border border-border">
                      <p className="font-semibold text-foreground">{qIdx + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="font-bold text-foreground">{String.fromCharCode(65 + optIdx)}.</span> {opt}
                          </div>
        ))}
                      </div>
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Answer:</span> {q.answer}</p>
                        <p className="text-xs text-muted-foreground mt-1"><span className="font-semibold text-foreground">Why:</span> {q.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pb-10">
              {script.map((line, index) => {
                const isLeo = line.speaker.toLowerCase() === "leo";
                const isActive = currentLineIndex === index;
                return (
                  <div key={`${index}-${line.text.slice(0, 20)}`} className={`flex gap-3 transition-all duration-300 ${isLeo ? "flex-row" : "flex-row-reverse"} ${isActive ? "scale-[1.02]" : "opacity-90"}`}>
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full shadow-sm ${isLeo ? "bg-muted text-muted-foreground" : "bg-brand/10 text-brand"}`}>
                      {isLeo ? <User className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                    </div>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm transition-all duration-300 ${isLeo ? `rounded-tl-sm border bg-card text-foreground ${isActive ? "border-brand ring-2 ring-brand/20" : "border-border"}` : `rounded-tr-sm bg-brand text-brand-foreground ${isActive ? "shadow-xl ring-4 ring-brand/40" : ""}`}`}>
                      <p className="mb-1 text-xs font-bold opacity-80">{line.speaker}</p>
                      <p>{line.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}