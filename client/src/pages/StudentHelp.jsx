import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, LogIn, Clock, BrainCircuit, BookOpen, 
  Music, Video, Mic, AlertTriangle, CheckCircle2 
} from "lucide-react";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const topics = [
  {
    icon: LogIn,
    title: "Joining a Quiz or Game Show",
    description: "Ask your teacher for the 10-character access code. Go to the 'Join Quiz' page, enter the code, and type your name. For Game Shows, you'll wait in a lobby until the teacher starts the match.",
  },
  {
    icon: Clock,
    title: "Taking the Assessment",
    description: "Read each question carefully. You can navigate between questions in standard quizzes. In Game Shows, you must answer before the timer runs out. ",
    warning: "Important: Do not switch tabs or minimize the window! The system tracks tab switches, and too many may result in an automatic submission.",
  },
  {
    icon: BrainCircuit,
    title: "Using the AI Teacher",
    description: "Stuck on a concept? Open the AI Teacher. You can paste your notes, ask specific questions, or request a summary. The AI will generate clear, easy-to-understand explanations tailored to your curriculum.",
  },
  {
    icon: BookOpen,
    title: "Summary & Study Pages",
    description: "Use the Summary page to review key takeaways from your classes. You can highlight text, create flashcards, and track your study progress over time.",
  },
  {
    icon: Music,
    title: "Music, Video & Podcasts",
    description: "Learning isn't just reading! Explore the Music page for focus playlists, the Video page for visual explanations, and the Podcast page to listen to study summaries on the go.",
  }
];

export default function StudentHelp() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className={`shrink-0 rounded-xl border border-border bg-card p-2.5 text-foreground transition hover:bg-accent ${focusRing}`}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student & User Guide</h1>
            <p className="text-muted-foreground">Learn how to make the most of your study tools.</p>
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {topics.map((topic, index) => (
            <div key={index} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-brand/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <topic.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{topic.title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{topic.description}</p>
              
              {topic.warning && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="font-medium">{topic.warning}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Encouragement Footer */}
        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6 text-center">
          <h3 className="text-lg font-semibold text-brand">You've got this! 🚀</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Use these tools consistently, and watch your understanding and grades improve.
          </p>
        </div>
      </div>
    </div>
  );
}
