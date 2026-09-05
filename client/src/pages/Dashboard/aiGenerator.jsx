import {
  FileText,
  Video,
  Music,
  Sparkles,
  Wand2,
  Clock,
  Play,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import api from "../../utils/api";
import NoteScanner from "../../components/NoteScanner";

export default function StudentAiGenerator() {
  const [activeMode, setActiveMode] = useState("summary");
  const [notesText, setNotesText] = useState("");
  const [generatedResult, setGeneratedResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const modes = [
    {
      id: "summary",
      label: "Note Summary",
      desc: "Audio + bulleted recap",
      icon: FileText,
      cardActive: "border-brand bg-brand/5",
      iconActive: "bg-brand/10 text-brand",
      btnBg: "bg-brand text-brand-foreground shadow-brand/20",
    },
    {
      id: "video",
      label: "Animated Video",
      desc: "4K Animated Scenes",
      icon: Video,
      cardActive: "border-electric bg-electric/5",
      iconActive: "bg-electric/10 text-electric",
      btnBg: "bg-electric text-electric-foreground shadow-electric/20",
    },
    {
      id: "music",
      label: "Study Music",
      desc: "Lyrics that stick",
      icon: Music,
      cardActive: "border-flame bg-flame/5",
      iconActive: "bg-flame/10 text-flame",
      btnBg: "bg-flame text-flame-foreground shadow-flame/20",
    },
  ];

  const currentMode = modes.find((m) => m.id === activeMode);

  const handleGenerate = async () => {
    if (!notesText.trim()) return;

    setIsGenerating(true);
    setError("");
    setGeneratedResult(null);

    try {
      const smartTitle =
        notesText.split("\n")[0].substring(0, 40).trim() ||
        `${activeMode} Notes`;

      const response = await api.post("/ai/generate", {
        text: notesText,
        mode: activeMode,
        vibe: "Enthusiastic Teacher",
        title: smartTitle,
        subject: "General",
      });

      setGeneratedResult(response.data.data.generatedText);
    } catch (err) {
      console.error("Generation failed:", err);
      setError(
        err.response?.data?.message || "Failed to generate content. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedResult) {
      navigator.clipboard.writeText(generatedResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen w-full bg-muted dark:bg-background transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
            <Wand2 className="w-8 h-8 text-brand" /> AI Generator
          </h1>
          <p className="text-muted-foreground mt-2 text-base md:text-lg">
            Drop in messy notes and get audio, visuals, and a clean summary back.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* LEFT COLUMN: INPUT & SETTINGS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Output Selection */}
            <div className="p-5 md:p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-display font-semibold text-foreground">
                  What should the AI make?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick an output, paste your notes, and let it do the boring part.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setActiveMode(mode.id)}
                    className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      activeMode === mode.id
                        ? `${mode.cardActive} shadow-md`
                        : "border-border bg-background hover:bg-accent/50"
                    }`}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${activeMode === mode.id ? mode.iconActive : "bg-muted text-muted-foreground"}`}>
                      <mode.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{mode.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{mode.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Notes Input (SCANNER IS NOW PROMINENTLY HERE) */}
            <div className="p-5 md:p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <label className="text-sm font-medium text-foreground">
                Your Messy Notes
              </label>
              
              {/* ✅ NOTE SCANNER PLACED RIGHT HERE */}
              <NoteScanner onScanComplete={(text) => setNotesText(text)} />

              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={8}
                maxLength={5000}
                placeholder="Paste your messy notes here, or use the scanner above to snap a photo..."
                className="flex w-full rounded-lg border border-input bg-background p-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none min-h-[200px]"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${notesText.length > 4500 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  {notesText.length} / 5000 characters
                </span>
              </div>
            </div>

            {/* 3. Customization Options & Generate */}
            <div className="p-5 md:p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
              <h2 className="text-lg font-display font-semibold text-foreground">Customize Output</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Voice Vibe</label>
                  <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option>Enthusiastic Teacher</option>
                    <option>Chill Storyteller</option>
                    <option>Hype Rap</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Animation Style</label>
                  <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option>Cartoon Explainer</option>
                    <option>Whiteboard Doodle</option>
                    <option>Anime Lecture</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Genre</label>
                  <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option>Lo-fi Study Beat</option>
                    <option>Catchy Pop Hook</option>
                    <option>Memory Trap Anthem</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!notesText.trim() || isGenerating}
                className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${currentMode.btnBg}`}
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> AI is thinking...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate {currentMode.label}</>
                )}
              </button>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: OUTPUT PREVIEW & HISTORY */}
          <div className="space-y-6">
            <div className="p-5 md:p-6 rounded-2xl bg-card border border-border shadow-sm min-h-[300px] flex flex-col">
              {isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-brand" />
                  <p className="text-sm font-medium">Generating your {currentMode.label}...</p>
                </div>
              ) : generatedResult ? (
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand" /> AI Output
                    </h3>
                    <button onClick={handleCopy} className="text-xs text-brand hover:underline flex items-center gap-1 transition-colors">
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="text-sm leading-relaxed space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {generatedResult.split("\n").map((line, index) => {
                      if (line.startsWith("**") && line.includes("**")) {
                        return <div key={index} className="mt-4 mb-2"><h4 className="text-brand font-bold text-base">{line.replace(/\*\*/g, "").trim()}</h4></div>;
                      } else if (line.startsWith("- ")) {
                        const bulletText = line.replace("- ", "").trim();
                        const parts = bulletText.split(/(\*\*.*?\*\*)/g);
                        return (
                          <div key={index} className="ml-4 text-muted-foreground flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                            <span>{parts.map((part, i) => part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="text-foreground">{part.replace(/\*\*/g, "")}</strong> : part)}</span>
                          </div>
                        );
                      } else if (line.trim() === "") {
                        return null;
                      } else {
                        return <p key={index} className="text-foreground">{line}</p>;
                      }
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className={`p-4 rounded-full transition-colors ${currentMode.iconActive}`}>
                    <currentMode.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-semibold text-foreground">Nothing generated yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[250px] mx-auto">
                      Your {currentMode.label.toLowerCase()} will show up right here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}