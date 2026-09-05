import {
  ArrowRight,
  BookOpenText,
  Lightbulb,
  ShieldCheck,
  Target,
  Sparkles,
  Globe2,
  Rocket,
  Users,
  GraduationCap,
  Quote,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";

// ==========================================
// EDIT YOUR FOUNDER DETAILS HERE
// ==========================================
const founderInfo = {
  fullName: "[Your Full Name]", // <-- CHANGE THIS
  role: "Founder & Lead Engineer",
  shortBio: "A passionate student engineer on a mission to fix how we learn.",
  // Replace this with a real photo of yourself, or a cool AI avatar!
  avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop", 
  quote: "I realized we weren't failing because we weren't smart; we were failing because the 'big English' in our textbooks made learning feel like a chore. I wanted to build a study companion as engaging as our favorite anime characters."
};

// ==========================================
// IMPACT GOALS (Replacing the fake stats)
// ==========================================
const impactGoals = [
  {
    icon: Users,
    value: "10,000+",
    label: "Students to empower with accessible AI learning tools.",
    color: "bg-brand-soft text-brand",
  },
  {
    icon: GraduationCap,
    value: "50+",
    label: "Partner schools to bridge the digital education gap.",
    color: "bg-electric-soft text-electric",
  },
  {
    icon: Rocket,
    value: "1 Million",
    label: "Hours of focused, stress-free study time generated.",
    color: "bg-flame-soft text-flame",
  },
];

const values = [
  {
    icon: Target,
    title: "Purpose-built for real students",
    description:
      "We design tools that help students stay organized, understand faster, and focus longer without burnout.",
  },
  {
    icon: Lightbulb,
    title: "AI that supports, not distracts",
    description:
      "Our platform turns dense notes into clear, engaging steps that improve retention and confidence.",
  },
  {
    icon: ShieldCheck,
    title: "Trust, clarity, and inclusion",
    description:
      "School leaders, parents, and learners all get the visibility they need, regardless of their school's budget.",
  },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* ================= HERO / MISSION SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/8 px-3 py-1.5 text-sm font-medium text-brand mb-6">
              <Globe2 className="h-4 w-4" />
              A Nation Builder Initiative
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Making complex textbooks feel like your favorite story.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Noted exists to make learning clearer, more focused, and actually fun. 
              We combine thoughtful design with practical AI tools to help students 
              learn with confidence, and help schools build a brighter future.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90"
              >
                Join the movement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3.5 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Partner with us
              </Link>
            </div>
          </div>

          {/* Visual Mission Card */}
          <div className="rounded-[30px] border border-border bg-card p-6 shadow-soft lg:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-brand-soft p-5">
                <BookOpenText className="h-7 w-7 text-brand" />
                <p className="mt-4 font-display text-3xl font-bold text-foreground">
                  100%
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  focused on student comprehension
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-electric-soft p-5">
                <Sparkles className="h-7 w-7 text-electric" />
                <p className="mt-4 font-display text-3xl font-bold text-foreground">
                  AI-First
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  turning "big English" into simple concepts
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-flame-soft p-5 sm:col-span-2">
                <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  Our Core Mission
                </p>
                <p className="mt-3 text-lg leading-7 text-foreground">
                  To democratize understanding. We believe every student deserves 
                  a tutor as engaging as an anime teacher and as patient as a mentor, 
                  available 24/7 to turn academic stress into academic success.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= THE ORIGIN STORY ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              How it started
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              It started with a question among friends.
            </h2>
          </div>

          <div className="max-w-4xl mx-auto bg-card rounded-[30px] border border-border p-8 md:p-12 shadow-soft">
            <Quote className="h-10 w-10 text-brand/30 mb-4" />
            <p className="text-lg md:text-xl text-foreground leading-relaxed mb-6">
              We were studying, frustrated by textbooks full of "big English" that made 
              simple concepts feel impossible. One of my friends looked up and asked: 
              <em className="text-brand font-semibold"> "Which anime character would you wish was your class teacher?"</em>
            </p>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              That question changed everything. We realized the problem wasn't that students 
              were lazy or not smart enough. The problem was that traditional studying is <strong>boring</strong>. 
              If we could make learning feel as engaging, visual, and memorable as our favorite 
              shows, we wouldn't just be building an app. We'd be fixing how our generation learns.
            </p>
          </div>
        </div>
      </section>

      {/* ================= NATIONAL VISION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              The National Impact
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Building the nation's brightest minds.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              A nation is only as strong as its education system. Right now, too many 
              brilliant students are left behind because they can't afford private tutors 
              or extra lessons. 
            </p>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Noted bridges this gap. By providing an AI-powered study companion that 
              translates dense academic jargon into clear, engaging audio and visual summaries, 
              we are leveling the playing field. We are ensuring that a student in an 
              underfunded public school has the exact same learning advantages as a student 
              in a top-tier private academy.
            </p>
          </div>
          <div className="grid gap-5">
            {impactGoals.map((goal) => (
              <div key={goal.label} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl ${goal.color}`}>
                  <goal.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">{goal.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{goal.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CORE VALUES ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              What drives us
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Learning should feel focused, not overwhelming.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {values.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-3xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
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

      {/* ================= THE SOLO FOUNDER SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              The Builder
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Driven by one vision, built from the ground up.
            </h2>
          </div>

          <div className="rounded-[30px] border border-border bg-card p-8 md:p-10 shadow-soft">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <img 
                  src={founderInfo.avatarUrl} 
                  alt={founderInfo.fullName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-brand/20 shadow-md"
                />
              </div>
              
              {/* Info */}
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-foreground">{founderInfo.fullName}</h3>
                <p className="text-brand font-medium mb-4">{founderInfo.role}</p>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {founderInfo.shortBio} Taking full ownership of the codebase, design, and vision, 
                  I built Noted end-to-end to ensure every feature directly serves the student's 
                  need for clarity and engagement.
                </p>
                
                {/* The Quote */}
                <div className="bg-muted/50 rounded-2xl p-5 border-l-4 border-brand">
                  <p className="text-foreground italic leading-relaxed">
                    "{founderInfo.quote}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}