import { useState, useEffect, useRef } from "react";
import {
  Video,
  Loader2,
  Sparkles,
  Film,
  Type,
  Upload,
  FileText,
  MessageCircle,
  Bell,
  RefreshCw,
} from "lucide-react";
import api from "../utils/api";
import NoteScanner from "../components/NoteScanner";

export default function VideoGenerator() {
  const [inputMethod, setInputMethod] = useState("type");
  const [notes, setNotes] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  
  // ✅ Locked to "story" mode to prevent server memory crashes
  const outputMode = "story"; 

  const [videoId, setVideoId] = useState(
    () => localStorage.getItem("activeVideoId") || null,
  );
  const [scenes, setScenes] = useState([]);
  const [videoTitle, setVideoTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [regeneratingScene, setRegeneratingScene] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Generating scenes...");

  const [libraryNotes, setLibraryNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await api.get("/ai/library");
        if (res.data.success)
          setLibraryNotes(
            res.data.data.filter(
              (item) => item.type === "summary" || item.type === "tutor",
            ),
          );
      } catch (err) {
        console.error(err);
      }
    };
    fetchLibrary();
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    let timeoutId;

    const poll = async () => {
      if (!videoId || isFinished) return;
      
      try {
        const res = await api.get(`/ai/video/status/${videoId}`);
        if (res.data.success) {
          const { videoData, progress: newProgress, isFinished: done, statusMessage: newStatusMessage } = res.data.data;
          
          setScenes(videoData.scenes);
          setVideoTitle(videoData.title);
          setProgress(newProgress);
          setStatusMessage(newStatusMessage || "Generating scenes...");

          if (done) {
            setIsFinished(true);
            localStorage.removeItem("activeVideoId");
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Noted AI Video Ready!", { body: `Your video "${videoTitle}" has finished generating!` });
            }
            return; // Stop polling
          }
        }
      } catch (err) { 
        console.error("Polling error:", err); 
      }
      
      timeoutId = setTimeout(poll, 2000);
    };

    if (videoId && !isFinished) {
      localStorage.setItem("activeVideoId", videoId);
      poll();
    }

    return () => clearTimeout(timeoutId);
  }, [videoId, isFinished]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await api.post("/ai/ocr/extract-text", { imageUrl: reader.result });
          if (res.data.success) {
            setNotes(prevNotes => prevNotes ? prevNotes + "\n\n--- 📄 New Page ---\n\n" + res.data.text : res.data.text);
          }
        } catch (err) { alert("OCR failed."); }
      };
      reader.readAsDataURL(file);
    } else if (file.type === "text/plain") {
      const text = await file.text();
      setNotes(prevNotes => prevNotes ? prevNotes + "\n\n--- 📄 New Page ---\n\n" + text : text);
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!notes.trim()) return alert("Please enter some notes first!");
    setIsGenerating(true);
    setIsFinished(false);
    setProgress(0);
    setScenes([]);

    try {
      const res = await api.post("/ai/video/generate-storyboard", {
        text: notes,
        aspectRatio,
        outputMode, // Always "story"
      });
      if (res.data.success) {
        setVideoId(res.data.data._id);
        setVideoTitle(res.data.data.title);
        setScenes(
          res.data.data.generatedText
            ? JSON.parse(res.data.data.generatedText).scenes
            : [],
        );
      }
    } catch (error) {
      alert("Failed to generate storyboard.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateScene = async (scene, index) => {
    setRegeneratingScene(index);
    try {
      const res = await api.post("/ai/video/regenerate-scene", {
        contentId: videoId,
        sceneIndex: index,
      });
      if (res.data.success) {
        const newScenes = [...scenes];
        newScenes[index] = res.data.data;
        setScenes(newScenes);
      }
    } catch (error) {
      alert("Failed to regenerate scene.");
    } finally {
      setRegeneratingScene(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              AI Video Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Turn notes into animated educational videos!
            </p>
          </div>
        </div>
        {isFinished && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Scenes Ready!</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex p-1 bg-muted rounded-lg w-fit mx-auto md:mx-0">
          <button
            onClick={() => setInputMethod("type")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMethod === "type" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <FileText className="w-4 h-4 inline mr-2" /> Type
          </button>
          <button
            onClick={() => setInputMethod("library")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMethod === "library" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <MessageCircle className="w-4 h-4 inline mr-2" /> Library
          </button>
          <button
            onClick={() => setInputMethod("upload")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMethod === "upload" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <Upload className="w-4 h-4 inline mr-2" /> Upload
          </button>
        </div>

        {inputMethod === "library" && (
          <select
            value={selectedNoteId}
            onChange={(e) => {
              setSelectedNoteId(e.target.value);
              const note = libraryNotes.find((n) => n._id === e.target.value);
              if (note) setNotes(note.generatedText || note.title);
            }}
            className="flex w-full rounded-lg border border-input bg-background p-3 text-sm"
          >
            <option value="">Choose a note</option>
            {libraryNotes.map((note) => (
              <option key={note._id} value={note._id}>
                {note.title}
              </option>
            ))}
          </select>
        )}

        {inputMethod === "upload" && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload a .txt file or an image (OCR)
            </p>
            <input
              type="file"
              accept=".txt,image/*"
              onChange={handleFileUpload}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand file:text-brand-foreground hover:file:bg-brand/90"
            />
          </div>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Paste your notes here..."
          className="w-full rounded-xl border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Aspect Ratio
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-background p-3 text-sm"
            >
              <option value="16:9">Landscape (16:9) - YouTube/Desktop</option>
              <option value="9:16">Portrait (9:16) - TikTok/Shorts</option>
            </select>
          </div>
          
          {/* ✅ REPLACED: Output Mode dropdown with a static info badge */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Output Mode
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              <Film className="w-4 h-4" />
              <span>Story Mode (Instant Play Scenes)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Scenes play individually for instant, crash-free generation!
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateStoryboard}
          disabled={isGenerating || !notes.trim()}
          className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-bold hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {isGenerating
            ? "Creating Storyboard..."
            : "Generate Video Storyboard"}
        </button>
      </div>

      {videoId && !isFinished && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-foreground">{statusMessage}</h3>
            <span className="text-sm font-medium text-brand">{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className="bg-brand h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground">
            You can navigate away! We will notify you when it's done.
          </p>
        </div>
      )}

      {scenes.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-500" /> {videoTitle}
          </h2>

          <div className="space-y-4">
            {scenes.map((scene, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm">
                      {scene.sceneNumber}
                    </span>
                    Scene {scene.sceneNumber}
                  </h3>
                  <button
                    onClick={() => handleRegenerateScene(scene, index)}
                    disabled={regeneratingScene === index}
                    className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-accent transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${regeneratingScene === index ? "animate-spin" : ""}`}
                    />{" "}
                    Regenerate
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Type className="w-3 h-3" /> Narration
                  </p>
                  <p className="text-sm text-foreground bg-background p-3 rounded-lg border border-border">
                    {scene.narration}
                  </p>
                </div>

                {scene.videoUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-black">
                    <video
                      src={scene.videoUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      className="w-full aspect-video object-cover"
                    />
                  </div>
                )}
                {scene.imageUrl && !scene.videoUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-black">
                    <img
                      src={scene.imageUrl}
                      alt={`Scene ${scene.sceneNumber}`}
                      className="w-full aspect-video object-cover animate-ken-burns"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
