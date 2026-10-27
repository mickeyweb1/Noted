import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Library,
  Users,
  Globe2,
  Target,
  Lightbulb,
  Headphones,
  BookOpen,
  Zap,
  KeyRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";

const features = [
  {
    icon: BrainCircuit,
    title: "AI study notes",
    description: "Turn messy class recordings, slides, and summaries into crisp, easy-to-understand learning material in minutes.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Student's notes and books arranged on a desk",
  },
  {
    icon: Clock3,
    title: "Focus-first workflows",
    description: "Build smart study blocks, reminders, and revision plans that match your real academic rhythm and reduce burnout.",
    image: "photo-1503676260728-1c00da094a0b",
    imageAlt: "Student concentrating on schoolwork at a desk",
  },
  {
    icon: Library,
    title: "Organized library",
    description: "Keep lessons, notes, flashcards, and readings in one clean, searchable workspace accessible from any device.",
    image: "photo-1521587760476-6c12a4b040da",
    imageAlt: "Shelves of books in a library",
  },
  {
    icon: Users,
    title: "Student progress tracking",
    description: "Empower students with clear insights into their study habits, revision patterns, and daily activity to boost confidence.",
    image: "photo-1529390079861-591de354faf5",
    imageAlt: "Students studying and reviewing classwork together",
  },
];

const audienceCards = [
  {
    title: "For schools",
    text: "Track student performance and support learning with data-backed insights for classes and administrative teams.",
    link: "/school",
    image: "photo-1509062522246-3755977927d7",
    imageAlt: "Teacher supporting students in a classroom",
  },
  {
    title: "For students",
    text: "Master any subject with AI-generated summaries, audio podcasts, and interactive quizzes tailored to your unique learning style.",
    link: "/student",
    image: "photo-1523240795612-9a054b0db644",
    imageAlt: "University students studying together in a library",
  },
  {
    title: "For personal use",
    text: "Turn your own notes into personalized revision questions, summaries, and study routines that actually stick.",
    link: "/personal",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Student writing study notes beside an open book",
  },
];

const stats = [
  { value: "Summaries", label: "Make class notes easier to review" },
  { value: "Audio", label: "Listen to lessons while on the go" },
  { value: "Quizzes", label: "Practice what you have learned" },
];

const howItWorks = [
  {
    step: "01",
    icon: BookOpen,
    title: "Paste your notes",
    description: "Drop in your messy class notes, textbook pages, or lecture transcripts.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Handwritten study notes on a desk",
  },
  {
    step: "02",
    icon: Zap,
    title: "AI transforms them",
    description: "Our engine instantly summarizes, structures, and generates audio or visual aids.",
    image: "photo-1517486808906-6ca8b3f04846",
    imageAlt: "Students sharing ideas while working together",
  },
  {
    step: "03",
    icon: Headphones,
    title: "Learn your way",
    description: "Listen to it like a podcast, watch the visual summary, or test yourself with AI quizzes.",
    image: "photo-1427504494785-3a9ca7044f45",
    imageAlt: "Students learning together in a classroom",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [quizCode, setQuizCode] = useState("");

  const handleJoinQuiz = (e) => {
    e.preventDefault();
    if (quizCode.length === 10) {
      // Navigate to the quiz taking page with the code
      navigate("/take-quiz", { state: { code: quizCode } });
    }
  };

  return (
    <MarketingLayout>
      {/* ================= HERO SECTION ================= */}
      <section className="relative isolate flex min-h-[min(760px,calc(100svh-4rem))] overflow-hidden bg-slate-950">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2000&q=85"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center motion-safe:animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-slate-950/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-slate-950/10" />

        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] items-center px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl landing-enter">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Globe2 className="h-4 w-4" />
              Official Nation Builder Project
            </div>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
              Transforming how our nation learns, one note at a time.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Noted empowers students, schools, and families to turn complex
              textbooks into engaging, accessible learning experiences.
              Building the nation's brightest minds starts here.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition hover:bg-white/90"
              >
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                View our mission
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/90">
              {[
                "AI summaries",
                "audio learning",
                "focus plans",
                "progress tracking",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <a
          href="https://unsplash.com/license"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-4 right-5 z-10 text-xs text-white/75 underline underline-offset-2"
        >
          Photo via Unsplash
        </a>
      </section>

      {/* ================= QUICK QUIZ ACCESS SECTION ================= */}
      <section className="border-y border-border bg-muted/30 px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[30px] border border-border bg-card shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative flex flex-col justify-between overflow-hidden border-b border-border bg-[#211b32] p-7 text-white sm:p-9 lg:border-b-0 lg:border-r lg:border-white/10 lg:p-11">
            <div className="relative z-10">
              <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white">
                <KeyRound className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
                Quick quiz access
              </p>
              <h2 className="mt-3 max-w-sm text-3xl font-bold tracking-tight sm:text-4xl">
                Your next quiz is one code away.
              </h2>
              <p className="mt-4 max-w-sm leading-7 text-white/75">
                Enter the code shared by your teacher and go straight to your assessment.
              </p>
            </div>
            <div className="relative z-10 mt-8 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white/85">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                No login needed
              </span>
            </div>
          </div>

          <div className="flex items-center p-6 sm:p-9 lg:p-11">
            <form onSubmit={handleJoinQuiz} className="w-full">
              <p className="text-sm font-medium text-muted-foreground">Join an assessment</p>
              <label htmlFor="quiz-code" className="mt-1 block text-xl font-semibold text-foreground">
                Enter your quiz code
              </label>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You can find it in the instructions from your teacher.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <KeyRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="quiz-code"
                    type="text"
                    value={quizCode}
                    onChange={(e) => setQuizCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase().slice(0, 10))}
                    placeholder="e.g. T-8X92A1B3"
                    maxLength={10}
                    autoComplete="off"
                    autoCapitalize="characters"
                    aria-describedby="quiz-code-hint"
                    className="h-14 w-full rounded-xl border border-border bg-background pl-11 pr-4 font-mono text-base tracking-wider text-foreground placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
                <button
                  type="submit"
                  disabled={quizCode.length !== 10}
                  className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-36"
                >
                  Join quiz
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p id="quiz-code-hint" className="mt-3 min-h-5 text-sm text-muted-foreground" aria-live="polite">
                {quizCode.length > 0 && quizCode.length < 10
                  ? `${10 - quizCode.length} character${quizCode.length !== 9 ? "s" : ""} remaining`
                  : "Enter the 10-character code provided by your teacher."}
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Core features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              A more useful way to study.
            </h2>
          </div>
          <p className="max-w-md leading-7 text-muted-foreground sm:text-right">
            Bring your learning materials, study sessions, and progress into one place.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, description, image, imageAlt }) => (
            <div
              key={title}
              className="landing-interactive group overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-44 overflow-hidden bg-muted">
                <img
                  src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=900&q=80`}
                  alt={imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                <div className="absolute bottom-4 left-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/90 text-brand shadow-soft">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-right text-xs text-muted-foreground">
          Photos via{" "}
          <a href="https://unsplash.com/license" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Unsplash
          </a>
        </p>
      </section>

      {/* ================= NATION BUILDER MISSION SECTION ================= */}
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
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-electric/10 rounded-[30px] blur-2xl"></div>
              <div className="landing-interactive group relative overflow-hidden rounded-[30px] border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-glow">
                <img
                  src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85"
                  alt="A student writing notes beside an open textbook"
                  loading="lazy"
                  className="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] sm:h-64"
                />
                <div className="flex items-start gap-4 p-6 sm:p-8">
                  <Lightbulb className="mt-1 h-10 w-10 shrink-0 text-brand" />
                  <div>
                    <h3 className="mb-2 text-2xl font-bold text-foreground">The Problem We Solve</h3>
                    <p className="leading-relaxed text-muted-foreground">
                      Students today are overwhelmed by dense textbooks and short attention spans.
                      Traditional studying isn't working. By converting text into engaging audio and
                      visual formats, we meet students where they are, turning passive reading into
                      active, memorable learning.
                    </p>
                    <a
                      href="https://unsplash.com/license"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block text-xs text-muted-foreground underline underline-offset-2"
                    >
                      Photo via Unsplash
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS SECTION ================= */}
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
              <div className="landing-interactive group relative z-10 flex flex-col items-center overflow-hidden text-center rounded-3xl border border-border bg-card shadow-soft hover:-translate-y-1 hover:shadow-glow transition duration-300">
                <div className="relative h-40 w-full overflow-hidden">
                  <img
                    src={`https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=800&q=80`}
                    alt={item.imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
                  <a
                    href="https://unsplash.com/license"
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-3 text-xs text-white/85 underline underline-offset-2"
                  >
                    Photo via Unsplash
                  </a>
                </div>
                <div className="p-6">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-primary-foreground shadow-md">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-brand uppercase tracking-widest mb-2">Step {item.step}</div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
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
            {audienceCards.map(({ title, text, link, image, imageAlt }) => (
              <Link key={title} to={link} className="landing-interactive group overflow-hidden rounded-[26px] border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-glow">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=900&q=80`}
                    alt={imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
                  <span className="absolute bottom-3 right-4 text-xs text-white/85">Photo via Unsplash</span>
                </div>
                <div className="h-full bg-background p-6">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold text-foreground">{title}</h3>
                  <p className="mb-5 text-sm leading-6 text-muted-foreground">{text}</p>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    Explore <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Photos via{" "}
            <a href="https://unsplash.com/license" target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Unsplash
            </a>
          </p>
        </div>
      </section>

      {/* ================= STATS SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-[30px] border border-border bg-card shadow-soft lg:grid-cols-2">
          <div className="landing-interactive group relative min-h-72 overflow-hidden sm:min-h-96">
            <img
              src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=85"
              alt="A student reading at a desk in a bright study space"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
            <a
              href="https://unsplash.com/license"
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-5 text-xs text-white/85 underline underline-offset-2"
            >
              Photo via Unsplash
            </a>
          </div>
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Made for everyday study</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              A little help at every step.
            </h2>
            <div className="mt-8 space-y-4">
              {stats.map((stat) => (
                <div key={stat.value} className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="min-w-24 font-display text-lg font-bold text-brand">{stat.value}</div>
                  <div className="text-sm leading-6 text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="landing-interactive group relative isolate overflow-hidden rounded-[30px] bg-slate-950 px-6 py-16 text-center shadow-glow sm:px-10 lg:px-16 lg:py-20">
          <img
            src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1800&q=85"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/15" />
          <div className="relative z-10 max-w-2xl text-left">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to build the future of learning?
            </h2>
            <p className="mt-4 max-w-xl text-lg text-white/90">
              Turn class notes into clear summaries, audio lessons, and practice
              quizzes with Noted.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
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
          <a
            href="https://unsplash.com/license"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 right-4 text-xs text-white/75 underline underline-offset-2"
          >
            Photo via Unsplash
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
}
