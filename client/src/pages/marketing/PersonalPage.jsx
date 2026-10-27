import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers3,
  Target,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";
import UnsplashCredit from "../../components/UnsplashCredit";

const photo = (id, width = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

const personalFeatures = [
  {
    icon: Target,
    title: "Personalized revision",
    description:
      "Build a study flow around your goals, your pace, and the subjects where you need the most support.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Open notebook and study materials on a desk",
  },
  {
    icon: Zap,
    title: "Quicker note conversion",
    description:
      "Transform quick notes into summaries, flashcards, and quiz prompts that keep your learning moving.",
    image: "photo-1503676260728-1c00da094a0b",
    imageAlt: "Student reading and working through study notes",
  },
  {
    icon: CheckCircle2,
    title: "Habit-based progress",
    description:
      "Stay consistent with reminders, focus blocks, and weekly progress tracking that feels realistic.",
    image: "photo-1529390079861-591de354faf5",
    imageAlt: "Students studying and reviewing classwork together",
  },
];

const steps = [
  {
    number: "01",
    title: "Bring what you’re learning",
    description: "Start with your notes and the subjects you want to work on.",
    icon: BookOpen,
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "A student arranging handwritten study notes",
  },
  {
    number: "02",
    title: "Choose how to review",
    description: "Use summaries, flashcards, quizzes, or audio to revisit the material.",
    icon: Layers3,
    image: "photo-1521587760476-6c12a4b040da",
    imageAlt: "Bookshelves in a quiet library",
  },
  {
    number: "03",
    title: "Make time to focus",
    description: "Use focus sessions and reminders to keep your study routine moving.",
    icon: Clock3,
    image: "photo-1503676260728-1c00da094a0b",
    imageAlt: "A student working through study material at a desk",
  },
];

const focusItems = [
  { label: "Biology review", detail: "Revisit your notes" },
  { label: "Focus session", detail: "Work at your own pace" },
  { label: "Practice quiz", detail: "Check what you remember" },
];

export default function PersonalPage() {
  return (
    <MarketingLayout>
      <section className="relative isolate flex min-h-[min(680px,calc(100svh-4rem))] overflow-hidden bg-slate-950">
        <img
          src={photo("photo-1434030216411-0b793f4b4173", 2000)}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
              For personal use
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl lg:leading-[1.05]">
              Study on your own terms, with a smarter routine.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Whether you are preparing for exams, building new skills, or
              improving your daily learning habits, Noted helps you stay
              organized and motivated.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Link
                to="/signup"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#personal-tools"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explore personal tools
              </a>
            </div>
          </div>
        </div>
        <UnsplashCredit className="absolute bottom-4 right-5 z-10 text-white/80 hover:text-white" />
      </section>

      <section id="personal-tools" className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Personal features
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Keep momentum with a system you can actually stick to.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {personalFeatures.map(({ icon: Icon, title, description, image, imageAlt }) => (
              <article
                key={title}
                className="landing-interactive group overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="h-44 overflow-hidden bg-muted sm:h-48">
                  <img
                    src={photo(image)}
                    alt={imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-right text-xs text-muted-foreground">
            <UnsplashCredit plural />
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Your study flow
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From your notes to a routine that works for you.
            </h2>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map(({ number, title, description, icon: Icon, image, imageAlt }) => (
              <li
                key={number}
                className="landing-interactive group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-44 overflow-hidden bg-muted sm:h-48">
                  <img
                    src={photo(image)}
                    alt={imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-slate-950/25" />
                  <span className="absolute bottom-4 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/90 font-display text-sm font-bold text-brand shadow-soft">
                    {number}
                  </span>
                  <UnsplashCredit className="absolute bottom-4 right-4 z-10 text-white/90 hover:text-white" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-soft lg:grid-cols-2">
          <div className="relative min-h-72 overflow-hidden bg-muted sm:min-h-96">
            <img
              src={photo("photo-1503676260728-1c00da094a0b", 1200)}
              alt="Student reading and working through study notes"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <UnsplashCredit className="absolute bottom-4 right-5 z-10 rounded bg-slate-950/55 px-2 py-1 text-white/90 hover:text-white" />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Make room for focus
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              A little structure can help you keep going.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Plan a focus block, set a reminder, and keep track of the work you
              want to return to. Your routine can grow one study session at a time.
            </p>
            <div className="mt-7 space-y-3">
              {focusItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground">{item.label}</span>
                  </div>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">{item.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="relative isolate overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 shadow-soft sm:px-10 sm:py-16 lg:px-16">
          <img
            src={photo("photo-1427504494785-3a9ca7044f45", 1800)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 z-0 bg-slate-950/70" />
          <div className="relative z-10 max-w-2xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
              Start learning your way
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Make your notes part of a routine that fits your life.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
              Create an account and explore Noted’s tools for personal study.
            </p>
            <Link
              to="/signup"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-brand shadow-soft transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <UnsplashCredit className="absolute bottom-4 right-5 z-10 text-white/80 hover:text-white" />
        </div>
      </section>
    </MarketingLayout>
  );
}
