import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Brain, Camera, Check, CheckCircle2, ChevronDown, Clipboard, Download,
  FileText, GraduationCap, Headphones, Loader2, MessageCircle, Mic, Pause, Play,
  Sparkles, Square, User, XCircle
} from "lucide-react";
import api from "../utils/api";
import NoteScanner from "../components/NoteScanner";

const SPEEDS = [0.75, 1, 1.25, 1.5];
const TONES = ["Funny", "Calm", "Energetic", "Serious"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const LENGTHS = [
  { id: "short", label: "Short", hint: "~3-5 min" },
  { id: "medium", label: "Medium", hint: "~5-8 min" },
  { id: "long", label: "Long", hint: "~10-12 min" },
];

const ELEVENLABS_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel - Warm & Natural" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam - Professional" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Callum - Energetic" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella - Soft & Calm" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi - Strong & Confident" },
];

/* ---------- Style helpers ---------- */
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const card = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";
const inputCls = "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand";
const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const ghostBtn = `inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-60 ${focusRing}`;

/* ---------- Pure helpers ---------- */
const removeCodeFence = (value) => value.replace(/```json/gi, "").replace(/```/g, "").trim();

const normalizeQuiz = (quiz) =>
  Array.isArray(quiz)
    ? quiz
        .filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length >= 2)
        .map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => String(o).trim()),
          answer: String(q.answer ?? q.correctAnswer ?? "").trim(),
          explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
        }))
    : [];

const parsePodcastResponse = (generatedText) => {
  try {
    let parsed = generatedText;
    if (typeof generatedText === "string") {
      const cleanText = removeCodeFence(generatedText);
      const firstBrace = cleanText.indexOf("{");
      const lastBrace = cleanText.lastIndexOf("}");
      const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? cleanText.slice(firstBrace, lastBrace + 1) : cleanText;
      parsed = JSON.parse(jsonText);
    }
    if (!parsed || typeof parsed !== "object") throw new Error("The podcast response was empty.");

    const title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Study Podcast";

    let script = [];
    if (Array.isArray(parsed.script)) {
      script = parsed.script
        .filter((line) => line && (typeof line.text === "string" || typeof line === "string"))
        .map((line) => {
          const text = typeof line === "string" ? line : line.text;
          const speaker = typeof line.speaker === "string" && line.speaker.toLowerCase().includes("leo") ? "Leo" : "Dr. Nova";
          return { speaker, text: text.trim() };
        })
        .filter((line) => line.text.length > 0);
    }

    if (script.length === 0) {
      script = [
        { speaker: "Leo", text: `Welcome to this study session about ${title}!` },
        { speaker: "Dr. Nova", text: `Let's explore this topic together.` },
      ];
    }

    return {
      title,
      script,
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.filter((t) => typeof t === "string" && t.trim()) : [],
      quiz: normalizeQuiz(parsed.quiz),
    };
  } catch (error) {
    console.error("Podcast parsing error:", error);
    throw new Error("The AI returned an invalid podcast format. Please try again with different notes.");
  }
};

const toChunks = (text, max = 200) => {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
  const out = [];
  sentences.forEach((sentence) => {
    let rest = sentence.trim();
    while (rest.length > max) {
      let cut = rest.lastIndexOf(",", max);
      if (cut < 60) cut = rest.lastIndexOf(" ", max);
      if (cut < 1) cut = max;
      out.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) out.push(rest);
  });
  return out;
};

const pickBrowserVoices = () => {
  const all = window.speechSynthesis.getVoices();
  const english = all.filter((v) => /^en/i.test(v.lang));
  const pool = english.length ? english : all;
  const leoVoice = pool.find((v) => /Daniel|Alex|David|Mark|Guy|Ryan|Google US English/i.test(v.name)) || pool[0];
  const novaVoice =
    pool.find((v) => v !== leoVoice && /Samantha|Karen|Zira|Aria|Jenny|Google UK English Female|Female/i.test(v.name)) ||
    pool.find((v) => v !== leoVoice) ||
    leoVoice;
  return { leoVoice, novaVoice };
};

const getErrorInfo = async (err) => {
  const status = err?.response?.status;
  let message = err?.message || "Something went wrong.";
  const data = err?.response?.data;
  try {
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      const parsed = JSON.parse(await data.text());
      if (parsed?.message) message = parsed.message;
    } else if (data?.message) {
      message = data.message;
    }
  } catch { /* keep the default message */ }
  return { status, message };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const norm = (value) => String(value ?? "").trim().toLowerCase();
const isCorrectOption = (q, opt, index) => {
  const answer = norm(q.answer);
  if (!answer) return false;
  if (/^[a-d]$/.test(answer)) return index === answer.charCodeAt(0) - 97;
  const stripLabel = (s) => s.replace(/^[a-d][.)]\s*/, "");
  return norm(opt) === answer || stripLabel(norm(opt)) === stripLabel(answer);
};

/* ---------- Small UI pieces ---------- */
function ChipGroup({ label, options, value, onChange }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${focusRing} ${
              value === option ? "border-brand bg-brand text-brand-foreground shadow-sm" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function VoiceSelect({ id, label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} appearance-none pr-9`}>
          {ELEVENLABS_VOICES.map((voice) => (<option key={voice.id} value={voice.id}>{voice.name}</option>))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

/* ---------- Component ---------- */
export default function PodcastGenerator() {
  const [inputMethod, setInputMethod] = useState("type");
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState("short");
  const [tone, setTone] = useState("Funny");
  const [level, setLevel] = useState("Beginner");

  const [script, setScript] = useState([]);
  const [keyTakeaways, setKeyTakeaways] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [quizPicks, setQuizPicks] = useState({});
  const [podcastTitle, setPodcastTitle] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);

  const [libraryNotes, setLibraryNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [copied, setCopied] = useState(false);

  const [studioAudioUrl, setStudioAudioUrl] = useState("");
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioProgress, setAudioProgress] = useState(null);
  
  // ✅ FIXED: Declared BEFORE usingStudio to prevent Temporal Dead Zone error
  const [useBrowserTTS, setUseBrowserTTS] = useState(false);
  const [studioTime, setStudioTime] = useState({ current: 0, duration: 0 });
  const usingStudio = !!studioAudioUrl && !useBrowserTTS;

  const [leoVoiceId, setLeoVoiceId] = useState("pNInz6obpgDQGcFmaJgB");
  const [novaVoiceId, setNovaVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");

  const speechRunId = useRef(0);
  const currentIndexRef = useRef(0);
  const scriptRef = useRef([]);
  const playbackSpeedRef = useRef(1);
  const studioUrlRef = useRef("");
  const studioAudioRef = useRef(null);

  useEffect(() => { scriptRef.current = script; }, [script]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLibrary = async () => {
      try {
        const response = await api.get("/ai/library", { signal: controller.signal });
        if (response.data?.success) {
          setLibraryNotes(response.data.data.filter((item) => item.type === "summary" || item.type === "tutor"));
        }
      } catch (requestError) {
        if (requestError.name !== "CanceledError") console.error("Failed to fetch library:", requestError);
      }
    };
    fetchLibrary();
    return () => controller.abort();
  }, []);

  // Wire up HTML5 audio events to React state
  useEffect(() => {
    const el = studioAudioRef.current;
    if (!el) return;

    const onPlay = () => { setIsPlaying(true); setIsPaused(false); };
    const onPause = () => { if (el.ended) return; setIsPlaying(false); setIsPaused(true); };
    const onEnded = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setStudioTime({ current: 0, duration: el.duration || 0 });
    };
    const onTime = () => setStudioTime({ current: el.currentTime, duration: el.duration || 0 });

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
    };
  }, [studioAudioUrl]);

  // If the user flips the browser-voice switch on mid-playback, stop the MP3.
  useEffect(() => {
    if (useBrowserTTS && studioAudioRef.current && !studioAudioRef.current.paused) {
      studioAudioRef.current.pause();
    }
  }, [useBrowserTTS]);

  useEffect(() => {
    return () => {
      speechRunId.current += 1;
      window.speechSynthesis?.cancel();
      if (studioUrlRef.current) URL.revokeObjectURL(studioUrlRef.current);
      if (studioAudioRef.current) {
        studioAudioRef.current.pause();
        studioAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (currentLineIndex >= 0) {
      document.getElementById(`line-${currentLineIndex}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentLineIndex]);

  // ✅ FIXED: Stop audio and reset time before swapping URL
  const replaceStudioAudio = (url) => {
    if (studioAudioRef.current) {
      studioAudioRef.current.pause();
      studioAudioRef.current.currentTime = 0;
    }
    if (studioUrlRef.current) {
      URL.revokeObjectURL(studioUrlRef.current);
    }
    studioUrlRef.current = url || "";
    setStudioAudioUrl(url || "");
    setStudioTime({ current: 0, duration: 0 });
  };

  const stopAudio = useCallback(() => {
    speechRunId.current += 1;
    window.speechSynthesis?.cancel();
    const el = studioAudioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
    setStudioTime({ current: 0, duration: 0 });
  }, []);

  const speakLine = useCallback(function speak(runId) {
    if (runId !== speechRunId.current) return;
    const activeScript = scriptRef.current;
    const index = currentIndexRef.current;
    if (index >= activeScript.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
      return;
    }

    const line = activeScript[index];
    const isLeo = line.speaker.toLowerCase() === "leo";
    const { leoVoice, novaVoice } = pickBrowserVoices();
    const chunks = toChunks(line.text);
    setCurrentLineIndex(index);

    if (chunks.length === 0) {
      currentIndexRef.current += 1;
      speak(runId);
      return;
    }

    chunks.forEach((chunk, i) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      const voice = isLeo ? leoVoice : novaVoice;
      if (voice) utterance.voice = voice;
      utterance.rate = playbackSpeedRef.current;
      utterance.pitch = isLeo ? 1.08 : 0.92;
      utterance.onerror = (event) => {
        if (runId !== speechRunId.current) return;
        if (event.error === "interrupted" || event.error === "canceled") return;
        speechRunId.current += 1;
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentLineIndex(-1);
        setError("Audio playback failed. Check your volume, or try another browser.");
      };
      if (i === chunks.length - 1) {
        utterance.onend = () => {
          if (runId !== speechRunId.current) return;
          currentIndexRef.current += 1;
          setTimeout(() => speak(runId), 150);
        };
      }
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const startAudio = (fromIndex = 0) => {
    if (!window.speechSynthesis || scriptRef.current.length === 0) {
      setError("Audio playback is not supported in this browser.");
      return;
    }
    speechRunId.current += 1;
    const runId = speechRunId.current;
    currentIndexRef.current = fromIndex;
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    setError("");
    setIsPlaying(true);
    setIsPaused(false);
    setTimeout(() => speakLine(runId), 80);
  };

  const toggleAudio = async () => {
    if (usingStudio) {
      const el = studioAudioRef.current;
      if (!el) return;
      try {
        if (el.paused) {
          el.playbackRate = playbackSpeedRef.current;
          await el.play();
        } else {
          el.pause();
        }
      } catch (error) {
        console.error("ElevenLabs audio playback failed:", error);
        setError("Could not play the studio audio.");
      }
      return;
    }

    // Browser TTS fallback
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
    startAudio(0);
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    playbackSpeedRef.current = speed;

    if (usingStudio) {
      if (studioAudioRef.current) studioAudioRef.current.playbackRate = speed;
      return;
    }

    if (isPlaying && !isPaused) {
      const runId = ++speechRunId.current;
      window.speechSynthesis.cancel();
      setTimeout(() => speakLine(runId), 80);
    }
  };

  const handleLibrarySelect = (event) => {
    const noteId = event.target.value;
    setSelectedNoteId(noteId);
    const note = libraryNotes.find((item) => item._id === noteId);
    if (note) setTopic((note.generatedText || note.title).slice(0, 50000));
  };

  const transcriptText = script.map((line) => `${line.speaker}: ${line.text}`).join("\n\n");

  const fetchLineAudio = async (line) => {
    const voiceId = line.speaker.toLowerCase() === "leo" ? leoVoiceId : novaVoiceId;
    const request = () =>
      api.post("/ai/text-to-speech", { text: line.text, style: "podcast", useCase: "podcast", voiceId }, { responseType: "blob" });
    try {
      return (await request()).data;
    } catch (requestError) {
      if (requestError.response?.status === 429) {
        await sleep(1500);
        return (await request()).data;
      }
      throw requestError;
    }
  };

  const generateStudioAudio = async () => {
    if (script.length === 0 || isAudioLoading) return;
    if (useBrowserTTS) {
      setNotice("Browser voice is on. Press play to listen for free, or turn it off to create studio audio.");
      return;
    }

    // ✅ FIXED: Stop any currently playing browser TTS before generating studio audio
    stopAudio();

    setIsAudioLoading(true);
    setError("");
    setNotice("");
    const total = script.length;
    setAudioProgress({ done: 0, total });

    try {
      const clips = new Array(total);
      let next = 0;
      let done = 0;
      let failed = false;

      const worker = async () => {
        while (!failed) {
          const i = next++;
          if (i >= total) return;
          try {
            clips[i] = await fetchLineAudio(script[i]);
          } catch (lineError) {
            failed = true;
            throw lineError;
          }
          done += 1;
          setAudioProgress({ done, total });
        }
      };
      await Promise.all([worker(), worker()]);

      replaceStudioAudio(URL.createObjectURL(new Blob(clips, { type: "audio/mpeg" })));
      setNotice("Studio audio is ready.");
    } catch (requestError) {
      console.error("Studio audio failed:", requestError);
      const { status, message } = await getErrorInfo(requestError);
      if (status === 402) {
        setUseBrowserTTS(true);
        setError(`${message} Switched to the free browser voice.`);
      } else {
        setError(message || "Studio audio could not be created. Browser playback is still available.");
      }
    } finally {
      setIsAudioLoading(false);
      setAudioProgress(null);
    }
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
    setQuizPicks({});
    setPodcastTitle("");
    replaceStudioAudio("");

    try {
      const response = await api.post("/ai/generate", {
        text: cleanTopic,
        mode: "podcast",
        length,
        tone,
        level,
        subject: "General",
      });
      const podcast = parsePodcastResponse(response.data?.data?.generatedText);

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

  const formatTime = (sec) => {
    if (!Number.isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const progress = usingStudio
    ? (studioTime.duration ? (studioTime.current / studioTime.duration) * 100 : 0)
    : (currentLineIndex >= 0 && script.length ? ((currentLineIndex + 1) / script.length) * 100 : 0);

  const hasSpeech = typeof window !== "undefined" && !!window.speechSynthesis;

  return (
    <div className="min-h-screen w-full bg-muted">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Mic className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">AI study podcast</h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Turn your notes into a conversation you can listen to, pause and study from.
          </p>
          <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5" /> AI-generated. Double-check important facts before an exam.
          </p>
        </header>

        <section className={`${card} space-y-6`}>
          <div className="space-y-4">
            <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 sm:w-fit" role="tablist">
              {[
                { id: "type", label: "Type topic", icon: FileText },
                { id: "scan", label: "Scan notes", icon: Camera },
                { id: "library", label: "From library", icon: MessageCircle },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={inputMethod === id}
                  onClick={() => { setInputMethod(id); if (id === "type") setSelectedNoteId(""); }}
                  className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${focusRing} ${
                    inputMethod === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            {inputMethod === "scan" && (
              <NoteScanner
                onScanComplete={(text) => {
                  setTopic((prev) => (prev ? `${prev}\n\n--- 📄 New Page ---\n\n${text}` : text));
                  setInputMethod("type");
                }}
              />
            )}

            {inputMethod === "library" && (
              <div className="space-y-1.5">
                <label htmlFor="saved-note" className="text-sm font-medium text-foreground">Select a saved note</label>
                <div className="relative">
                  <select id="saved-note" value={selectedNoteId} onChange={handleLibrarySelect} className={`${inputCls} appearance-none pr-9`}>
                    <option value="">Choose a note</option>
                    {libraryNotes.map((note) => (<option key={note._id} value={note._id}>{note.title} ({new Date(note.createdAt).toLocaleDateString()})</option>))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="podcast-topic" className="text-sm font-medium text-foreground">
                {inputMethod === "type" ? "What should they discuss?" : "Review or edit your notes"}
              </label>
              <textarea
                id="podcast-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                rows={inputMethod === "scan" ? 7 : 5}
                maxLength={50000}
                placeholder="Example: The water cycle, black holes, or photosynthesis..."
                className={`${inputCls} resize-none p-4`}
              />
              <div className="flex justify-end text-xs text-muted-foreground">{topic.length.toLocaleString()} / 50,000</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ChipGroup label="Tone" options={TONES} value={tone} onChange={setTone} />
            <ChipGroup label="Study level" options={LEVELS} value={level} onChange={setLevel} />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Podcast length</span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Podcast length">
              {LENGTHS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={length === option.id}
                  onClick={() => setLength(option.id)}
                  className={`rounded-xl border p-3 text-center transition ${focusRing} ${
                    length === option.id ? "border-brand bg-brand-soft text-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-[11px] opacity-80">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-muted p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Voices</p>
                <p className="text-xs text-muted-foreground">
                  {useBrowserTTS ? "Free browser voice. Unlimited, quality varies." : "ElevenLabs studio voices, one for each host."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useBrowserTTS}
                aria-label="Use free browser voice only"
                onClick={() => setUseBrowserTTS((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${focusRing} ${useBrowserTTS ? "bg-brand" : "bg-border"}`}
              >
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${useBrowserTTS ? "translate-x-5" : ""}`} />
              </button>
            </div>
            {!useBrowserTTS && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <VoiceSelect id="leo-voice" label="Leo (curious student)" value={leoVoiceId} onChange={setLeoVoiceId} />
                <VoiceSelect id="nova-voice" label="Dr. Nova (expert teacher)" value={novaVoiceId} onChange={setNovaVoiceId} />
              </div>
            )}
          </div>

          <button type="button" onClick={handleGenerate} disabled={topic.trim().length < 5 || isLoading} className={`${primaryBtn} h-12 w-full text-base`}>
            {isLoading ? (<><Loader2 className="h-5 w-5 animate-spin" /> Writing your podcast...</>) : (<><Sparkles className="h-5 w-5" /> Generate podcast</>)}
          </button>

          {error && script.length === 0 && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}
        </section>

        {isLoading && (
          <div role="status" className="flex flex-col items-center justify-center space-y-3 py-12 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <p className="text-sm font-medium">Planning the conversation and writing the script...</p>
          </div>
        )}

        {!isLoading && script.length > 0 && (
          <section className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4">
            {notice && (
              <div role="status" className="flex items-center justify-center gap-2 rounded-xl bg-brand-soft p-3 text-center text-sm text-brand">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {notice}
              </div>
            )}
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
              </div>
            )}

            <div className="sticky top-4 z-10 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-bold text-foreground">{podcastTitle}</h2>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${usingStudio ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"}`}>
                      {usingStudio ? "🎙️ Studio" : "🌐 Browser"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {usingStudio
                      ? `Studio voice — ${formatTime(studioTime.current)} / ${formatTime(studioTime.duration)}`
                      : `Leo and Dr. Nova ${currentLineIndex >= 0 ? `- line ${currentLineIndex + 1} of ${script.length}` : `- ${script.length} lines`}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border bg-background p-1" role="group" aria-label="Playback speed">
                    {SPEEDS.map((speed) => (
                      <button
                        type="button"
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        aria-pressed={playbackSpeed === speed}
                        aria-label={`Set playback speed to ${speed} times`}
                        className={`rounded px-2 py-1 text-xs font-bold transition ${focusRing} ${playbackSpeed === speed ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={toggleAudio}
                    disabled={!hasSpeech && !studioAudioUrl}
                    className={`rounded-full bg-brand p-3 text-brand-foreground shadow transition hover:bg-brand/90 disabled:opacity-50 ${focusRing}`}
                    aria-label={isPaused ? "Resume podcast" : isPlaying ? "Pause podcast" : "Play podcast"}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  {(isPlaying || isPaused) && (
                    <button type="button" onClick={stopAudio} className={`rounded-full border border-border bg-background p-3 text-muted-foreground transition hover:text-foreground ${focusRing}`} aria-label="Stop podcast">
                      <Square className="h-4 w-4 fill-current" />
                    </button>
                  )}
                </div>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Podcast progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              {!hasSpeech && !studioAudioUrl && <p className="text-xs text-destructive">This browser can't play speech. Try Chrome, Edge or Safari.</p>}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={copyTranscript} className={ghostBtn}>
                {copied ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy transcript"}
              </button>
              <button type="button" onClick={downloadTranscript} className={ghostBtn}>
                <Download className="h-4 w-4" /> Download
              </button>
            </div>

            <div className={`${card} space-y-3`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-foreground"><Headphones className="h-5 w-5 text-brand" /> Studio audio</h3>
                  <p className="text-xs text-muted-foreground">
                    {useBrowserTTS ? "Turn off the browser voice above to create studio audio." : "A downloadable MP3 with a different voice for each host."}
                  </p>
                </div>
                <button type="button" onClick={generateStudioAudio} disabled={isAudioLoading || useBrowserTTS} className={`${primaryBtn} py-2.5 text-sm`}>
                  {isAudioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headphones className="h-4 w-4" />}
                  {isAudioLoading ? (audioProgress ? `Recording ${audioProgress.done}/${audioProgress.total}...` : "Creating audio...") : studioAudioUrl ? "Recreate audio" : "Create studio audio"}
                </button>
              </div>
              {isAudioLoading && audioProgress && (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(audioProgress.done / audioProgress.total) * 100}%` }} />
                </div>
              )}
              {studioAudioUrl && (
                <div className="space-y-2 rounded-xl bg-brand-soft p-3">
                  {/* ✅ FIXED: Restored controls so the element isn't invisible, allowing users to scrub/seek */}
                  <audio
                    ref={studioAudioRef}
                    controls
                    preload="metadata"
                    src={studioAudioUrl}
                    className="w-full"
                  >
                    Your browser does not support audio playback.
                  </audio>
                  <a href={studioAudioUrl} download={`${podcastTitle || "study-podcast"}.mp3`} className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-brand hover:underline ${focusRing}`}>
                    <Download className="h-3.5 w-3.5" /> Download MP3
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Transcript</h3>
              {script.map((line, index) => {
                const isLeo = line.speaker.toLowerCase() === "leo";
                const isActive = currentLineIndex === index;
                return (
                  <div key={`${index}-${line.text.slice(0, 20)}`} id={`line-${index}`} className={`flex gap-3 ${isLeo ? "flex-row" : "flex-row-reverse"}`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isLeo ? "bg-card text-muted-foreground ring-1 ring-border" : "bg-brand-soft text-brand"}`}>
                      {isLeo ? <User className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm transition-all duration-300 ${
                        isLeo
                          ? `rounded-tl-sm border bg-card text-foreground ${isActive ? "border-brand ring-2 ring-brand/30" : "border-border"}`
                          : `rounded-tr-sm bg-brand text-brand-foreground ${isActive ? "ring-4 ring-brand/30" : ""}`
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-xs font-bold opacity-80">{line.speaker}</p>
                        {/* ✅ FIXED: Hide per-line play buttons when using Studio audio to prevent overlapping voices */}
                        {!usingStudio && (
                          <button
                            type="button"
                            onClick={() => startAudio(index)}
                            disabled={!hasSpeech}
                            aria-label={`Play from line ${index + 1}`}
                            className={`rounded-full p-1 opacity-70 transition hover:opacity-100 disabled:hidden ${focusRing}`}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p>{line.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {keyTakeaways.length > 0 && (
              <div className={card}>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-brand" /> Key takeaways
                </h3>
                <ul className="space-y-2.5">
                  {keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><Check className="h-3 w-3" /></span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {quiz.length > 0 && (
              <div className={`${card} space-y-4 pb-6`}>
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Brain className="h-5 w-5 text-brand" /> Test yourself
                </h3>
                {quiz.map((q, qIdx) => {
                  const picked = quizPicks[qIdx];
                  const answered = picked !== undefined;
                  return (
                    <div key={qIdx} className="space-y-3 rounded-xl border border-border bg-background p-4">
                      <p className="font-semibold text-foreground">{qIdx + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const right = isCorrectOption(q, opt, optIdx);
                          const isPicked = picked === optIdx;
                          let style = "border-border bg-card hover:bg-accent";
                          if (answered) {
                            if (right) style = "border-green-500 bg-green-500/10";
                            else if (isPicked) style = "border-destructive bg-destructive/10";
                            else style = "border-border bg-card opacity-60";
                          }
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={answered}
                              onClick={() => setQuizPicks((prev) => ({ ...prev, [qIdx]: optIdx }))}
                              className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-sm transition ${focusRing} ${style}`}
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">{String.fromCharCode(65 + optIdx)}</span>
                              <span className="min-w-0 flex-1 break-words text-foreground">{opt}</span>
                              {answered && right && <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />}
                              {answered && isPicked && !right && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                            </button>
                          );
                        })}
                      </div>
                      {answered && q.explanation && (
                        <p className="rounded-lg bg-brand-soft p-3 text-xs text-foreground"><span className="font-semibold">Why:</span> {q.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
