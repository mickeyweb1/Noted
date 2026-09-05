import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Library,
  Sparkles,
  Users,
  Globe2,
  Target,
  Lightbulb,
  Headphones,
  BookOpen,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";

const features = [
  {
    icon: BrainCircuit,
    title: "AI study notes",
    description:
      "Turn messy class recordings, slides, and summaries into crisp, easy-to-understand learning material in minutes.",
  },
  {
    icon: Clock3,
    title: "Focus-first workflows",
    description:
      "Build smart study blocks, reminders, and revision plans that match your real academic rhythm and reduce burnout.",
  },
  {
    icon: Library,
    title: "Organized library",
    description:
      "Keep lessons, notes, flashcards, and readings in one clean, searchable workspace accessible from any device.",
  },
  {
    icon: Users,
    title: "School + parent visibility",
    description:
      "Bring families and institutions into the same performance and progress loop without friction or extra paperwork.",
  },
];

const audienceCards = [
  {
    title: "For schools",
    text: "Track student performance and support learning with data-backed insights for classes and administrative teams.",
    link: "/school",
    accent: "from-brand/15 to-electric/10",
  },
  {
    title: "For parents",
    text: "Stay informed about study habits, revision patterns, and daily activity with clear progress snapshots.",
    link: "/parents",
    accent: "from-flame/15 to-brand/10",
  },
  {
    title: "For personal use",
    text: "Turn your own notes into personalized revision questions, summaries, and study routines that actually stick.",
    link: "/personal",
    accent: "from-electric/15 to-brand/10",
  },
];

const stats = [
  { value: "3x", label: "more active study time" },
  { value: "90%", label: "less manual note cleanup" },
  { value: "24/7", label: "access to your revision engine" },
];

const howItWorks = [
  {
    step: "01",
    icon: BookOpen,
    title: "Paste your notes",
    description: "Drop in your messy class notes, textbook pages, or lecture transcripts.",
  },
  {
    step: "02",
    icon: Zap,
    title: "AI transforms them",
    description: "Our engine instantly summarizes, structures, and generates audio or visual aids.",
  },
  {
    step: "03",
    icon: Headphones,
    title: "Learn your way",
    description: "Listen to it like a podcast, watch the visual summary, or test yourself with AI quizzes.",
  },
];

export default function LandingPage() {
  return (
    <MarketingLayout>
      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.20),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.18),transparent_25%)]" />

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/8 px-3 py-1.5 text-sm font-medium text-brand">
                <Globe2 className="h-4 w-4" />
                Official Nation Builder Project
              </div>

              <h1 className="max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Transforming how our nation learns, one note at a time.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                Noted empowers students, schools, and families to turn complex 
                textbooks into engaging, accessible learning experiences. 
                Building the nation's brightest minds starts here.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-95"
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3.5 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  View our mission
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                {[
                  "AI summaries",
                  "audio learning",
                  "focus plans",
                  "progress tracking",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Right Side (Dashboard Mockup) - Kept exactly as you had it */}
            <div className="relative">
              <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-brand/15 blur-3xl" />
              <div className="absolute -right-8 bottom-4 h-40 w-40 rounded-full bg-electric/15 blur-3xl" />

              <div className="relative rounded-[28px] border border-border bg-card p-5 shadow-glow">
                <div className="rounded-[22px] border border-border bg-gradient-to-br from-brand-soft via-background to-electric-soft p-5">
                  <div className="mb-5 flex items-center justify-between rounded-2xl border border-border bg-background/80 p-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today</p>
                      <p className="mt-1 font-display text-xl font-bold">Study sprint</p>
                    </div>
                    <div className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">45 min</div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-background p-4 shadow-soft">
                      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-semibold text-foreground">84%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-brand/10">
                        <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-brand to-electric" />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-sm text-muted-foreground">Summary</p>
                        <p className="mt-2 font-display text-2xl font-bold text-foreground">12</p>
                        <p className="text-xs text-muted-foreground">topic notes ready</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-sm text-muted-foreground">Quiz score</p>
                        <p className="mt-2 font-display text-2xl font-bold text-foreground">91%</p>
                        <p className="text-xs text-muted-foreground">up 14% this week</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground">Next focus block</p>
                        <p className="text-xs text-brand">AI suggested</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between rounded-xl bg-muted p-3 text-sm">
                        <span>Biology revision</span>
                        <span className="font-medium text-foreground">18:30</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Core Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything students need to study with less stress.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-glow">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= NEW: NATION BUILDER MISSION SECTION ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/8 px-3 py-1.5 text-sm font-medium text-brand mb-4">
                <Target className="h-4 w-4" />
                Our National Impact
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                More than an app. A tool for national development.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                We believe that a nation's greatest resource is the mind of its students. 
                Noted is designed to bridge the education gap, ensuring that every student—whether 
                in a top-tier private school or an underfunded public school—has access to 
                world-class, AI-powered study tools.
              </p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-foreground"><strong>Inclusive Access:</strong> Free tiers ensure no student is left behind due to financial constraints.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-foreground"><strong>Teacher Empowerment:</strong> Reduces administrative burden, allowing educators to focus on mentoring.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-foreground"><strong>Future Ready:</strong> Prepares the next generation with digital literacy and AI fluency.</span>
                </li>
              </ul>
            </div>
            
            {/* Visual element for the mission */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-electric/10 rounded-[30px] blur-2xl"></div>
              <div className="relative rounded-[30px] border border-border bg-card p-8 shadow-soft">
                <Lightbulb className="h-10 w-10 text-brand mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">The Problem We Solve</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Students today are overwhelmed by dense textbooks and short attention spans. 
                  Traditional studying isn't working. By converting text into engaging audio and 
                  visual formats, we meet students where they are, turning passive reading into 
                  active, memorable learning.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= NEW: HOW IT WORKS SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Simple Workflow</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From messy notes to mastery in 3 steps.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {howItWorks.map((item, index) => (
            <div key={item.step} className="relative">
              {index < howItWorks.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-brand/50 to-transparent -translate-x-1/2 z-0"></div>
              )}
              <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-3xl border border-border bg-card shadow-soft hover:shadow-glow transition">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-primary-foreground shadow-md">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-brand uppercase tracking-widest mb-2">Step {item.step}</div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= AUDIENCE SECTION ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Who it's for</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for every part of the learning ecosystem.
            </h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {audienceCards.map(({ title, text, link, accent }) => (
              <Link key={title} to={link} className={`group rounded-[26px] border border-border bg-gradient-to-br ${accent} p-[1px] shadow-soft`}>
                <div className="h-full rounded-[25px] bg-background p-6">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold text-foreground">{title}</h3>
                  <p className="mb-5 text-sm leading-6 text-muted-foreground">{text}</p>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= STATS SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-border bg-card p-8 shadow-soft lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Proven Results</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                A calmer, smarter study flow for every learner.
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-muted/30 p-5 text-center">
                  <div className="font-display text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= NEW: FINAL CTA SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-brand to-electric p-10 text-center shadow-glow lg:p-16">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-30"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to build the future of learning?
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-white/80">
              Join thousands of students and schools already using Noted to turn 
              academic challenges into confident achievements.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-brand shadow-lg transition hover:bg-white/90"
              >
                Get started for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Talk to our team
              </Link>
            </div>
          </div>
        </div>
      </section>

    </MarketingLayout>
  );
} 