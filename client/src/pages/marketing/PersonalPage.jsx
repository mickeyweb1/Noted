import { ArrowRight, CheckCircle2, Sparkles, Target, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";

const personalFeatures = [
  {
    icon: Target,
    title: "Personalized revision",
    description:
      "Build a study flow around your goals, your pace, and the subjects where you need the most support.",
  },
  {
    icon: Zap,
    title: "Quicker note conversion",
    description:
      "Transform quick notes into summaries, flashcards, and quiz prompts that keep your learning moving.",
  },
  {
    icon: CheckCircle2,
    title: "Habit-based progress",
    description:
      "Stay consistent with reminders, focus blocks, and weekly progress tracking that feels realistic.",
  },
];

export default function PersonalPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              For personal use
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Study on your own terms, with a smarter routine.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Whether you are preparing for exams, building new skills, or
              improving your daily learning habits, Noted helps you stay
              organized and motivated.
            </p>
            <div className="mt-8">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-soft"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-border bg-card p-6 shadow-soft lg:p-8">
            <div className="rounded-[24px] border border-border bg-gradient-to-br from-electric-soft via-background to-brand-soft p-5">
              <div className="rounded-2xl border border-border bg-background/90 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Your week
                  </p>
                  <Sparkles className="h-4 w-4 text-electric" />
                </div>
                <div className="space-y-3">
                  {[
                    { subject: "Biology", time: "2 hrs" },
                    { subject: "Chemistry", time: "1.5 hrs" },
                    { subject: "Review quiz", time: "30 min" },
                  ].map((item) => (
                    <div
                      key={item.subject}
                      className="flex items-center justify-between rounded-xl bg-muted p-3 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {item.subject}
                      </span>
                      <span className="text-muted-foreground">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Personal features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Keep momentum with a system you can actually stick to.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {personalFeatures.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-3xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
