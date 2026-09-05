import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Users,
  Trophy,
  BookOpen,
  Headphones,
  School,
  Zap,
  Flame,
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
  },
  {
    icon: Trophy,
    title: "Friendly school leaderboards",
    description:
      "Compete with your classmates in a healthy way. Track your study hours, maintain your streak, and climb the school rankings.",
  },
  {
    icon: Users,
    title: "Virtual study squads",
    description:
      "Join shared focus rooms with your friends. Study together in real-time, even when you aren't in the same room.",
  },
  {
    icon: Headphones,
    title: "Learn on the go",
    description:
      "Download your AI-generated audio summaries and listen to them on the bus, before a game, or right before bed.",
  },
  {
    icon: Target,
    title: "Smart exam prep",
    description:
      "Don't just read—test yourself. The AI automatically generates practice quizzes based on your class notes to ensure you're ready.",
  },
  {
    icon: Zap,
    title: "Zero burnout focus timers",
    description:
      "Use our built-in Pomodoro focus blocks designed specifically for student attention spans, keeping you sharp without the stress.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Get your school invite code",
    description:
      "Your school admin or teacher will give you a unique, one-time code to securely link your account to your school's portal.",
  },
  {
    step: "02",
    title: "Connect with your classes",
    description:
      "Select your grade and subjects. Instantly sync with your classmates and see your school's study leaderboard.",
  },
  {
    step: "03",
    title: "Study smarter & top your class",
    description:
      "Paste your notes, generate AI audio/visuals, take quizzes, and build an unbreakable study streak.",
  },
];

export default function StudentPage() {
  return (
    <MarketingLayout>
      {/* ================= HERO SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/8 px-3 py-1.5 text-sm font-medium text-brand mb-6">
              <GraduationCap className="h-4 w-4" />
              For High School & University Students
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Survive exam season. <br /> Actually enjoy learning.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              School is hard enough without staring at boring textbooks for
              hours. Noted turns your class notes into engaging audio, visual
              summaries, and instant quizzes—so you can study less, remember
              more, and still have time for your friends.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/signup/school-student"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90"
              >
                Join my school
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/signup/personal"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Use it independently
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {[
                "Syncs with your syllabus",
                "Offline audio mode",
                "No data used in focus rooms",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Student Dashboard Mockup */}
          <div className="rounded-[30px] border border-border bg-card p-6 shadow-soft lg:p-8">
            <div className="rounded-[24px] border border-border bg-gradient-to-br from-brand-soft via-background to-electric-soft p-5">
              <div className="rounded-2xl border border-border bg-background/90 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Your Dashboard
                  </p>
                  <div className="flex items-center gap-1 text-xs font-bold text-flame">
                    <Flame className="h-4 w-4 fill-current" /> 12 Day Streak
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Current Subject AI Card */}
                  <div className="rounded-xl bg-muted p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-foreground">
                        Physics 101: Kinematics
                      </span>
                      <Sparkles className="h-4 w-4 text-electric" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-brand/10 py-2 text-xs font-medium text-brand">
                        <Headphones className="h-3 w-3" /> Listen (12m)
                      </div>
                      <div className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-background py-2 text-xs font-medium text-muted-foreground">
                        <BookOpen className="h-3 w-3" /> Quiz
                      </div>
                    </div>
                  </div>

                  {/* Mini Leaderboard */}
                  <div className="rounded-xl bg-background border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-electric" /> WEEKLY SCHOOL
                      LEADERBOARD
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">
                          1. Sarah M.
                        </span>
                        <span className="text-xs text-muted-foreground">
                          14h 20m
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm bg-brand/5 rounded-lg px-2 py-1 border border-brand/20">
                        <span className="text-brand font-bold">2. You</span>
                        <span className="text-xs text-brand font-medium">
                          12h 45m
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">
                          3. David K.
                        </span>
                        <span className="text-xs text-muted-foreground">
                          11h 10m
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-3xl border border-border bg-card shadow-soft">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-primary-foreground shadow-md font-display text-xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
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
          {studentFeatures.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-3xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-glow"
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
