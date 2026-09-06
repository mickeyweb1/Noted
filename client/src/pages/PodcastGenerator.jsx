import { useState } from "react";
import { Mic, MessageCircle, Sparkles, Loader2, User, GraduationCap, Play, Pause } from "lucide-react";
import api from "../utils/api";

export default function PodcastGenerator() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState([]);
  const [podcastTitle, setPodcastTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setError("");
    setScript([]);
    setPodcastTitle("");

    try {
      const response = await api.post("/ai/generate", {
        text: topic,
        mode: "podcast",
        title: `${topic} Podcast`,
        subject: "General",
      });

      const rawText = response.data.data.generatedText;
      
      // Parse the JSON script from the AI response
      try {
        const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.script && Array.isArray(parsed.script)) {
            setScript(parsed.script);
            setPodcastTitle(parsed.title || `${topic} Study Podcast`);
          } else {
            throw new Error("Invalid script format");
          }
        } else {
          throw new Error("No JSON found");
        }
      } catch (parseError) {
        console.error("Parse error:", parseError);
        setError("The AI generated a response, but it wasn't in the correct script format. Please try again.");
      }

    } catch (err) {
      console.error("Generation failed:", err);
      setError(err.response?.data?.message || "Failed to generate podcast. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAudio = () => {
    // Placeholder for audio functionality
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen w-full bg-muted dark:bg-background transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight flex items-center justify-center gap-3">
            <Mic className="w-8 h-8 text-brand" /> AI Study Podcast
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Turn your notes into a funny, mind-blowing conversation between a curious student and an expert teacher.
          </p>
        </div>

        {/* Input Section */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <label className="text-sm font-medium text-foreground">
            What topic should they discuss?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={4}
            placeholder="e.g., The Water Cycle, Black Holes, Photosynthesis, or paste your messy notes here..."
            className="flex w-full rounded-lg border border-input bg-background p-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || isLoading}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-brand text-brand-foreground"
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Writing the script...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Generate Podcast</>
            )}
          </button>
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Output Section */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-brand" />
            <p className="text-sm font-medium">Recording the podcast...</p>
          </div>
        )}

        {!isLoading && script.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Podcast Header */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/20">
              <div>
                <h2 className="text-xl font-bold text-foreground">{podcastTitle}</h2>
                <p className="text-xs text-muted-foreground mt-1">Featuring Leo & Dr. Nova</p>
              </div>
              <button 
                onClick={toggleAudio}
                className="p-3 rounded-full bg-brand text-brand-foreground hover:bg-brand/90 transition-all shadow-lg"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            </div>

            {/* Chat Bubbles */}
            <div className="space-y-4">
              {script.map((line, index) => {
                const isLeo = line.speaker.toLowerCase() === 'leo';
                return (
                  <div 
                    key={index} 
                    className={`flex gap-3 ${isLeo ? 'flex-row' : 'flex-row-reverse'} animate-in slide-in-from-bottom-2 duration-300`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                      isLeo ? 'bg-muted text-muted-foreground' : 'bg-brand/10 text-brand'
                    }`}>
                      {isLeo ? <User className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isLeo 
                        ? 'bg-card border border-border text-foreground rounded-tl-sm' 
                        : 'bg-brand text-brand-foreground rounded-tr-sm'
                    }`}>
                      <p className="font-bold text-xs mb-1 opacity-80">{line.speaker}</p>
                      <p>{line.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
