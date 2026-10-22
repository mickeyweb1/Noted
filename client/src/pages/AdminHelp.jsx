import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, FileText, Trophy, Users, BarChart3, 
  Share2, Clock, AlertTriangle, CheckCircle2, Download 
} from "lucide-react";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const steps = [
  {
    icon: FileText,
    title: "1. Create a Quiz or Game Show",
    description: "Go to your dashboard and click 'New Quiz' or 'New Game Show'. You can generate questions instantly using AI by pasting your notes, or add them manually. Set time limits and anti-cheat tab-switch limits here.",
  },
  {
    icon: Share2,
    title: "2. Share the Access Code",
    description: "Once created, you will see a unique 10-character access code (e.g., T-8X92A1B3). Share this code with your students. They will use it to join the session from their devices.",
  },
  {
    icon: Users,
    title: "3. Students Join the Session",
    description: "Students will navigate to the 'Join Quiz' page, enter the code, and type their name. For Game Shows, they will wait in a lobby until you click 'Start Live Match'.",
  },
  {
    icon: Trophy,
    title: "4. Host a Live Game Show",
    description: "As the admin, you control the pace. Click 'Start Live Match' to begin. You can view the live scoreboard, see who is answering, and use the 'Disqualify' or 'Add Code' buttons if needed.",
    highlight: "Pro Tip: Game Shows feature a 'Steal' mechanic! If a student answers incorrectly, their opponent gets a chance to steal the points.",
  },
  {
    icon: BarChart3,
    title: "5. View Results & Analytics",
    description: "After the session, go to 'Quiz Results'. You can view individual student performance, see a breakdown of every question they answered, and export the entire class's results to a CSV file for your records.",
  }
];

export default function AdminHelp() {
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
            <h1 className="text-3xl font-bold text-foreground">Teacher & Admin Guide</h1>
            <p className="text-muted-foreground">Everything you need to know to run smooth assessments.</p>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-brand/30">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">{step.description}</p>
                  {step.highlight && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand/5 p-3 text-sm text-brand">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="font-medium">{step.highlight}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / Support Footer */}
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <h3 className="text-lg font-semibold text-foreground">Need more help?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            If you encounter any issues or have questions about advanced features, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
