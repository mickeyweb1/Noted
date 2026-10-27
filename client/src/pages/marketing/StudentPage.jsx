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
                Building a generation of collaborative, confident learners.
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                The traditional education system often isolates students,
                leading to immense stress and burnout during exam seasons. Noted
                changes the culture of studying from a lonely, stressful chore
                into a collaborative, engaging experience.
              </p>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                By introducing friendly competition, shared focus rooms, and
                AI-assisted learning, we are nurturing a generation of students
                who are not just academically brilliant, but also mentally
                resilient and tech-fluent.
              </p>
            </div>
            <div className="rounded-[30px] border border-border bg-card p-8 shadow-soft">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Why students love Noted:
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">
                    <strong>Less Exam Anxiety:</strong> AI quizzes and audio
                    summaries make revision feel manageable and even fun.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">
                    <strong>Peer Motivation:</strong> School leaderboards and
                    study squads turn isolation into a team sport.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">
                    <strong>Digital Fluency:</strong> Learn how to leverage AI
                    ethically and effectively, a crucial skill for the future
                    workforce.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-brand to-electric p-10 text-center shadow-glow lg:p-16">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-30"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <School className="h-10 w-10 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to upgrade your study game?
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Ask your school admin for your invite code, or start your personal
              journey today. Your future self will thank you.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup/school-student"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-brand shadow-lg transition hover:bg-white/90"
              >
                I have a school code
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/signup/personal"
                className="inline-flex items-center justify-center rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Start independently
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
