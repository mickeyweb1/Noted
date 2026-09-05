import { useState } from "react";
import { Video, Loader2, Sparkles, Film, Type, Image, Play, Check } from "lucide-react";
import api from "../utils/api";

export default function VideoGenerator() {
  const [notes, setNotes] = useState("");
  const [scenes, setScenes] = useState([]);
  const [videoTitle, setVideoTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchingScene, setSearchingScene] = useState(null);
  const [foundVideos, setFoundVideos] = useState({});

  const handleGenerateStoryboard = async () => {
    if (!notes.trim()) return alert("Please enter some notes first!");
    setIsGenerating(true);
    setScenes([]);
    setFoundVideos({});
    
    try {
      const res = await api.post("/ai/generate", {
        text: notes,
        mode: "video",
        title: "AI Animated Video"
      });
      
      if (res.data.success) {
        try {
          let cleanJson = res.data.data.generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
          const firstBracket = cleanJson.indexOf('{');
          const lastBracket = cleanJson.lastIndexOf('}');
          const parsed = JSON.parse(cleanJson.substring(firstBracket, lastBracket + 1));
          
          setVideoTitle(parsed.title || "AI Video Storyboard");
          setScenes(parsed.scenes || []);
        } catch (e) {
          alert("Failed to parse video scenes. Try again.");
        }
      }
    } catch (error) {
      alert("Failed to generate storyboard. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFindStockVideo = async (scene, index) => {
    setSearchingScene(index);
    
    try {
      const res = await api.post("/ai/video/search-stock", {
        visualPrompt: scene.visualPrompt,
        sceneNumber: scene.sceneNumber
      });
      
      if (res.data.success) {
        setFoundVideos(prev => ({
          ...prev,
          [index]: {
            url: res.data.data.videoUrl,
            thumbnail: res.data.data.thumbnail,
            duration: res.data.data.duration
          }
        }));
      }
    } catch (error) {
      alert(`Failed to find video for Scene ${scene.sceneNumber}. Please try again.`);
      console.error("Video search error:", error);
    } finally {
      setSearchingScene(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
          <Video className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">AI Video Studio</h1>
          <p className="text-sm text-muted-foreground">Turn your notes into an animated educational video!</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <label className="text-sm font-medium text-foreground">Your Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste your notes here (e.g., The water cycle, Photosynthesis, World War II)..."
          className="w-full h-32 rounded-xl border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
        />
        <button
          onClick={handleGenerateStoryboard}
          disabled={isGenerating || !notes.trim()}
          className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-bold hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {isGenerating ? "Directing Scenes..." : "Generate Video Storyboard"}
        </button>
      </div>

      {/* Storyboard Display */}
      {scenes.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-500" /> {videoTitle}
          </h2>

          <div className="space-y-4">
            {scenes.map((scene, index) => (
              <div key={index} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm">
                      {scene.sceneNumber}
                    </span>
                    Scene {scene.sceneNumber}
                  </h3>
                  
                  {/* Find Stock Video Button */}
                  <button 
                    onClick={() => handleFindStockVideo(scene, index)}
                    disabled={searchingScene === index || foundVideos[index]}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {searchingScene === index ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                    ) : foundVideos[index] ? (
                      <><Check className="w-4 h-4" /> Video Found</>
                    ) : (
                      <><Video className="w-4 h-4" /> Find Stock Video</>
                    )}
                  </button>
                </div>

                {/* Narration */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Type className="w-3 h-3" /> Voiceover Narration
                  </p>
                  <p className="text-sm text-foreground bg-background p-3 rounded-lg border border-border">
                    {scene.narration}
                  </p>
                </div>

                {/* Visual Prompt */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Image className="w-3 h-3" /> AI Visual Prompt
                  </p>
                  <p className="text-xs text-muted-foreground bg-background p-3 rounded-lg border border-border font-mono">
                    {scene.visualPrompt}
                  </p>
                </div>

{/* Found Stock Video/Image Display */}
{foundVideos[index] && (
  <div className="space-y-2">
    <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
      <Play className="w-3 h-3" /> 
      {foundVideos[index].type === 'image' ? 'Stock Image' : 'Stock Video'}
    </p>
    <div className="relative rounded-lg overflow-hidden border border-border bg-black">
      {foundVideos[index].type === 'video' ? (
        <video 
          src={foundVideos[index].url} 
          controls 
          className="w-full"
          poster={foundVideos[index].thumbnail}
        />
      ) : (
        // ✅ Display as image with Ken Burns effect
        <div className="relative w-full aspect-video">
          <img 
            src={foundVideos[index].imageUrl || foundVideos[index].thumbnail} 
            alt={`Scene ${scene.sceneNumber}`}
            className="w-full h-full object-cover animate-ken-burns"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="w-12 h-12 text-white/70" />
          </div>
        </div>
      )}
    </div>
    <p className="text-xs text-muted-foreground">
      {foundVideos[index].type === 'video' 
        ? `Duration: ${foundVideos[index].duration}s` 
        : 'Static image (5s display)'}
    </p>
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