import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  GraduationCap,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";
import UnsplashCredit from "../../components/UnsplashCredit";

const photo = (id, width = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

const howItWorks = [
  {
    step: "01",
    title: "Join your school",
    description: "Use the invite code from your school or teacher to connect to your school portal.",
    image: "photo-1509062522246-3755977927d7",
    imageAlt: "Students learning together in a classroom",
  },
  {
    step: "02",
    title: "Bring your class notes",
    description: "Add the notes and learning material you want to review, in your own time.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Open notebook and study materials on a desk",
  },
  {
    step: "03",
    title: "Choose how to learn",
    description: "Review with AI summaries, listen to audio, or check your understanding with quizzes.",
    image: "photo-1523240795612-9a054b0db644",
    imageAlt: "Students studying together around a table",
  },
];

const studentFeatures = [
  {
    icon: BookOpen,
    title: "Class-specific AI summaries",
    description: "Turn your lecture notes and slides into clear summaries and visual study guides.",
    image: "photo-1456324504439-367cee3b3c32",
    imageAlt: "Study notes and open books ready for review",
  },
  {
    icon: Users,
    title: "Study together",
    description: "Join shared focus rooms and work alongside classmates, wherever you are.",
    image: "photo-1521737711867-e3b97375f902",
    imageAlt: "Students working together at a shared table",
  },
  {
    icon: Headphones,
    title: "Listen on the go",
    description: "Create audio summaries from your notes and revisit lessons away from your desk.",
    image: "photo-1516321318423-f06f85e504b3",
    imageAlt: "Student listening to audio while using a laptop",
  },
  {
    icon: Target,
    title: "Practice with quizzes",
    description: "Generate practice quizzes from class notes to help you review what you have learned.",
    image: "photo-1513258496099-48168024aec0",
    imageAlt: "Student writing in a notebook during class",
  },
  {
    icon: Zap,
    title: "Focus sessions",
    description: "Use built-in focus timers to structure a study session and take breaks.",
    image: "photo-1491841550275-ad7854e35ca6",
    imageAlt: "Books and stationery arranged for a study session",
  },
  {
    icon: GraduationCap,
    title: "Keep learning resources together",
    description: "Return to your saved learning materials and pick up where you left off.",
    image: "photo-1503676260728-1c00da094a0b",
    imageAlt: "Student reading and taking notes at a desk",
  },
];

export default function StudentPage() {
  return (
    <MarketingLayout>
      <section className="relative isolate flex min-h-[min(700px,calc(100svh-4rem))] overflow-hidden bg-slate-950">
        <img
          src={photo("photo-1522202176988-66273c2fd55f", 2000)}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center motion-safe:animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/10" />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="landing-enter max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <GraduationCap className="h-4 w-4" />
              Made for the way students learn
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
              Make more of what you learn in class.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Bring your notes to Noted and turn them into summaries, audio, and practice quizzes. Find a study rhythm that works for you, with tools for learning on your own or alongside classmates.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link to="/signup/school-student" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90">
                Join my school <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/signup/personal" className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20">
                Study independently
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/90">
              {["AI summaries", "Audio learning", "Practice quizzes", "Focus rooms"].map((item) => (
                <div key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />{item}</div>
              ))}
            </div>
          </div>
        </div>
        <a href="https://unsplash.com/license" target="_blank" rel="noreferrer" className="absolute bottom-4 right-5 z-10 text-xs text-white/75 underline underline-offset-2">Photo via Unsplash</a>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Getting Started</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">A study routine that starts with your notes.</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {howItWorks.map((item) => (
              <article key={item.step} className="landing-interactive group overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-52 overflow-hidden bg-muted">
                  <img src={photo(item.image)} alt={item.imageAlt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
                  <span className="absolute bottom-4 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/90 font-display text-sm font-bold text-brand shadow-soft">{item.step}</span>
                </div>
                <div className="p-6"><h3 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h3><p className="text-sm leading-6 text-muted-foreground">{item.description}</p></div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-right text-xs text-muted-foreground">
            <UnsplashCredit plural />
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Your student toolkit</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">A few useful ways to make studying your own.</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {studentFeatures.map(({ icon: Icon, title, description, image, imageAlt }) => (
            <article key={title} className="landing-interactive group overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="relative h-44 overflow-hidden bg-muted">
                <img src={photo(image)} alt={imageAlt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                <div className="absolute bottom-4 left-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/90 text-brand shadow-soft"><Icon className="h-5 w-5" /></div>
              </div>
              <div className="p-6"><h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3><p className="text-sm leading-6 text-muted-foreground">{description}</p></div>
            </article>
          ))}
        </div>
        <p className="mt-5 text-right text-xs text-muted-foreground">
          <UnsplashCredit plural />
        </p>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Learning, together</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">A little more room to find your way through a subject.</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">Every student has their own way of working through new ideas. Noted brings your class materials together with flexible ways to review, listen, practice, and focus.</p>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">Use the tools that suit the moment, whether you are revisiting a lesson alone or studying alongside your classmates.</p>
            </div>
            <div className="group relative isolate min-h-[380px] overflow-hidden rounded-[30px] bg-slate-950 shadow-soft">
              <img src={photo("photo-1529390079861-591de354faf5", 1400)} alt="Classmates collaborating on a classroom assignment" loading="lazy" className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" />
              <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 z-10 p-7 text-white sm:p-9"><p className="text-lg font-medium leading-7">Your notes. Your pace. Your way to learn.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="group relative isolate overflow-hidden rounded-[30px] bg-slate-950 px-6 py-14 text-center shadow-glow sm:px-10 lg:px-16 lg:py-20">
          <img src={photo("photo-1524178232363-1fb2b075b655", 1800)} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 z-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none" />
          <div className="absolute inset-0 z-0 bg-slate-950/75" />
          <div className="relative z-10 mx-auto max-w-2xl text-white">
            <GraduationCap className="mx-auto mb-4 h-10 w-10 text-white/80" />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to make your notes work for you?</h2>
            <p className="mt-4 text-lg text-white/85">Join through your school or start a personal learning space.</p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/signup/school-student" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90">Join my school <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/signup/personal" className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20">Study independently</Link>
            </div>
          </div>
          <a href="https://unsplash.com/license" target="_blank" rel="noreferrer" className="absolute bottom-4 right-5 z-10 text-xs text-white/75 underline underline-offset-2">Photo via Unsplash</a>
        </div>
      </section>
    </MarketingLayout>
  );
}
