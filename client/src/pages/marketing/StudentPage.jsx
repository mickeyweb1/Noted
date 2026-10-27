import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Users,
  Trophy,
  BookOpen,
  Headphones,
  Zap,
  GraduationCap,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";

const studentFeatures = [
  {
    icon: BookOpen,
    title: "Class-specific AI summaries",
    description:
      "Turn your specific teacher's lecture notes and slides into catchy audio summaries and visual guides tailored to your syllabus.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Student's notes and books arranged on a desk",
  },
  {
    icon: Trophy,
    title: "Friendly school leaderboards",
    description:
      "Take part in friendly academic challenges and see how your study progress compares with your classmates.",
    image: "photo-1517486808906-6ca8b3f04846",
    imageAlt: "Students sharing ideas while studying together",
  },
  {
    icon: Users,
    title: "Virtual study squads",
    description:
      "Join shared focus rooms with your friends. Study together in real-time, even when you aren't in the same room.",
    image: "photo-1529390079861-591de354faf5",
    imageAlt: "Students working together on a class assignment",
  },
  {
    icon: Headphones,
    title: "Learn on the go",
    description:
      "Download your AI-generated audio summaries and listen to them on the bus, before a game, or right before bed.",
    image: "photo-1516280440614-37939bbacd81",
    imageAlt: "A student listening to audio with headphones",
  },
  {
    icon: Target,
    title: "Smart exam prep",
    description:
      "Don't just read—test yourself. The AI automatically generates practice quizzes based on your class notes to ensure you're ready.",
    image: "photo-1427504494785-3a9ca7044f45",
    imageAlt: "Students studying and reviewing material together",
  },
  {
    icon: Zap,
    title: "Zero burnout focus timers",
    description:
      "Use our built-in Pomodoro focus blocks designed specifically for student attention spans, keeping you sharp without the stress.",
    image: "photo-1503676260728-1c00da094a0b",
    imageAlt: "Student focused on schoolwork at a desk",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Get your school invite code",
    description:
      "Your school admin or teacher will give you a unique, one-time code to securely link your account to your school's portal.",
    image: "photo-1509062522246-3755977927d7",
    imageAlt: "Teacher helping students in a classroom",
  },
  {
    step: "02",
    title: "Connect with your classes",
    description:
      "Select your grade and subjects. Instantly sync with your classmates and see your school's study leaderboard.",
    image: "photo-1523240795612-9a054b0db644",
    imageAlt: "University students studying together",
  },
  {
    step: "03",
    title: "Study smarter & top your class",
    description:
      "Paste your notes, generate AI audio/visuals, take quizzes, and build an unbreakable study streak.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Open notebook and study materials on a desk",
  },
];

export default function StudentPage() {
  return (
    <MarketingLayout>
      {/* ================= HERO SECTION ================= */}
      <section className="relative isolate flex min-h-[min(700px,calc(100svh-4rem))] overflow-hidden bg-slate-950">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2000&q=85"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center motion-safe:animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/10" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl landing-enter">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <GraduationCap className="h-4 w-4" />
              For High School & University Students
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
              Make study time work better for you.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Turn class notes into audio, visual summaries, and practice quizzes.
              Find a more engaging way to review your subjects and make space for
              the rest of your day.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup/school-student"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90"
              >
                Join my school
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/signup/personal"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
              >
                Use it independently
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/90">
              {["AI study summaries", "Audio learning", "Practice quizzes"].map((item) => (
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

      {/* ================= HOW IT WORKS (STUDENT JOURNEY) ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Getting Started
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Join your school portal in 3 easy steps.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative">
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-brand/30 to-transparent -translate-x-1/2 z-0"></div>
                )}
                <div className="landing-interactive group relative z-10 overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img
                      src={`https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=900&q=80`}
                      alt={item.imageAlt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
                    <span className="absolute bottom-4 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/90 font-display text-sm font-bold text-brand shadow-soft">
                      {item.step}
                    </span>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= EXPANDED FEATURES SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            The Ultimate Student Toolkit
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to top your class without the burnout.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studentFeatures.map(({ icon: Icon, title, description, image, imageAlt }) => (
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
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" />
                <div className="absolute bottom-4 left-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/90 text-brand shadow-soft">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= NATION BUILDER IMPACT (STUDENT MENTAL HEALTH & COLLABORATION) ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                The National Impact
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Make learning feel less like a solo effort.
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Studying can feel like a lot to manage on your own. Noted brings
                together tools for reviewing class material, practicing what you
                have learned, and studying alongside classmates.
              </p>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Whether you are preparing for an exam or catching up on a lesson,
                choose the format that helps you stay engaged: notes, audio,
                quizzes, or a shared focus session.
              </p>
            </div>
            <div className="group relative isolate min-h-[420px] overflow-hidden rounded-[30px] bg-slate-950 shadow-soft">
              <img
                src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1400&q=85"
                alt="Students collaborating on a study assignment"
                loading="lazy"
                className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/10" />
              <div className="absolute bottom-0 left-0 right-0 z-10 p-7 text-white sm:p-9">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                  Find your way to learn
                </p>
                <h3 className="mt-3 text-2xl font-bold sm:text-3xl">
                  One study space, different ways to make progress.
                </h3>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-white/85 sm:text-base">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    Review class notes as clear summaries.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    Listen to audio and practice with quizzes.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    Study with classmates in shared focus rooms.
                  </li>
                </ul>
              </div>
              <a
                href="https://unsplash.com/license"
                target="_blank"
                rel="noreferrer"
                className="absolute right-4 top-4 z-10 text-xs text-white/75 underline underline-offset-2"
              >
                Photo via Unsplash
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="landing-interactive group relative isolate overflow-hidden rounded-[30px] bg-slate-950 px-6 py-14 text-center shadow-2xl sm:px-10 sm:py-16">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1800&q=85"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/60" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">
              Make your next study session count
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to find a better way to study?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-white/80">
              Join through your school or start independently with study tools built around your class material.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/signup/school-student"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90"
              >
                I have a school code
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/signup/personal"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
              >
                Start independently
              </Link>
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
        </div>
      </section>
    </MarketingLayout>
  );
}
