import { Link } from "react-router-dom";
import { FileText, Video, Mic, Music, ArrowRight, Sparkles } from "lucide-react";

export default function StudioHub() {
  const tools = [
    {
      id: 1,
      title: "Note Summary",
      description: "Turn messy notes, textbooks, or scanned images into clean, structured study summaries instantly.",
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      link: "/aiGenerator", // ⚠️ CHANGE THIS to your actual Summary route
      colorClass: "text-blue-500 bg-blue-500/10"
    },
    {
      id: 2,
      title: "Video Studio",
      description: "Generate animated educational videos with AI visuals, voiceovers, and seamless scene stitching.",
      icon: Video,
      gradient: "from-purple-500 to-pink-500",
      link: "/video-studio", // ⚠️ CHANGE THIS to your actual Video route
      colorClass: "text-purple-500 bg-purple-500/10"
    },
    {
      id: 3,
      title: "Podcast Generator",
      description: "Transform your topics into engaging, two-host conversational podcasts with Leo and Dr. Nova.",
      icon: Mic,
      gradient: "from-orange-500 to-red-500",
      link: "/podcast", // ⚠️ CHANGE THIS to your actual Podcast route
      colorClass: "text-orange-500 bg-orange-500/10"
    },
    {
      id: 4,
      title: "Music Generation",
      description: "Convert your study notes into catchy Hip-Hop, Lo-Fi, or Afrobeat tracks to help you memorize faster.",
      icon: Music,
      gradient: "from-green-500 to-emerald-500",
      link: "/music-studio", // ⚠️ CHANGE THIS to your actual Music route
      colorClass: "text-green-500 bg-green-500/10"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12 space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 text-brand text-sm font-semibold border border-brand/20">
            <Sparkles className="w-4 h-4" />
            AI Study Suite
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
            What do you want to create today?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose a tool below to transform your study materials into interactive, engaging, and easy-to-remember formats.
          </p>
        </div>

        {/* 4-Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {tools.map((tool) => (
            <Link 
              key={tool.id} 
              to={tool.link}
              className="group relative flex flex-col p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand/30 transition-all duration-300"
            >
              {/* Top Accent Line */}
              <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-md bg-gradient-to-r ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${tool.colorClass} group-hover:scale-110 transition-transform duration-300`}>
                  <tool.icon className="w-8 h-8" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-brand group-hover:translate-x-1 transition-all duration-300" />
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-brand transition-colors">
                {tool.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Footer / Quick Tip */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            💡 <span className="font-semibold text-foreground">Pro Tip:</span> You can also access all your previously generated content in the{" "}
            <Link to="/library" className="text-brand hover:underline font-medium">Student Library</Link>.
          </p>
        </div>

      </div>
    </div>
  );
}