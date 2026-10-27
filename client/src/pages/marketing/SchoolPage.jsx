import {
  ArrowRight,
  BarChart3,
  Building2,
  ShieldCheck,
  KeyRound,
  BrainCircuit,
  CheckCircle2,
  Trophy,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";

const schoolFeatures = [
  {
    icon: BrainCircuit,
    title: "Instant AI Quiz Generation",
    description:
      "Teachers can paste lesson notes or upload documents, and our AI instantly generates perfectly formatted, multiple-choice questions with explanations.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Teacher preparing handwritten lesson notes",
  },
  {
    icon: Trophy,
    title: "Live Game Show Mode",
    description:
      "Transform standard tests into engaging, real-time competitive quizzes. Features live scoreboards, team modes, and exciting 'steal' mechanics.",
    image: "photo-1517486808906-6ca8b3f04846",
    imageAlt: "Students collaborating in a classroom",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Anti-Cheat Testing",
    description:
      "Ensure assessment integrity with built-in tab-switch detection, right-click disabling, and automatic submission if limits are exceeded.",
    image: "photo-1509062522246-3755977927d7",
    imageAlt: "Teacher guiding students during a classroom lesson",
  },
  {
    icon: WifiOff,
    title: "Offline-Resilient Assessments",
    description:
      "No internet? No problem. Students can continue taking quizzes offline, and their answers will automatically sync and submit the moment they reconnect.",
    image: "photo-1503676260728-1c00da094a0b",
    imageAlt: "Student studying independently at a desk",
  },
  {
    icon: BarChart3,
    title: "Deep Performance Insights",
    description:
      "Instantly grade tests and view detailed breakdowns of student performance, time taken per question, and class-wide misconceptions.",
    image: "photo-1529390079861-591de354faf5",
    imageAlt: "Students reviewing classwork together",
  },
  {
    icon: KeyRound,
    title: "Frictionless Student Access",
    description:
      "No complex logins. Teachers generate unique, one-time access codes, and students can jump straight into their assigned tests in seconds.",
    image: "photo-1427504494785-3a9ca7044f45",
    imageAlt: "Students learning together around a table",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Register your institution",
    description: "Set up your school's profile, add your teachers, and customize your admin dashboard in minutes.",
    image: "photo-1509062522246-3755977927d7",
    imageAlt: "Teacher welcoming students into a classroom",
  },
  {
    step: "02",
    title: "Generate & assign quizzes",
    description: "Use our AI to instantly create a standard test or a Live Game Show, then share simple access codes with your students.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Notes and study materials prepared for a lesson",
  },
  {
    step: "03",
    title: "Monitor & empower",
    description: "Watch live results roll in, prevent cheating automatically, and use detailed reports to celebrate student growth.",
    image: "photo-1529390079861-591de354faf5",
    imageAlt: "Students working together on a classroom assignment",
  },
];

export default function SchoolPage() {
  return (
    <MarketingLayout>
      {/* ================= HERO SECTION ================= */}
      <section className="relative isolate flex min-h-[min(700px,calc(100svh-4rem))] overflow-hidden bg-slate-950">
        <img
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=2000&q=85"
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
              <Building2 className="h-4 w-4" />
              For Educational Institutions
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
              A clearer way to assess, understand, and support learning.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Bring AI-assisted quiz creation, interactive assessments, and student
              performance insights into one school-friendly workflow.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup/school-admin"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90"
              >
                Register your school
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
              >
                Contact us
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/90">
              {["AI question generation", "Flexible access", "Assessment insights"].map((item) => (
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

      {/* ================= HOW IT WORKS (ADMIN JOURNEY) ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              The Admin Journey
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Run a secure, engaging assessment in 3 simple steps.
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
            Assessment Capabilities
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to run modern, digital tests.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {schoolFeatures.map(({ icon: Icon, title, description, image, imageAlt }) => (
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

      {/* ================= NATION BUILDER IMPACT FOR SCHOOLS ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                The National Impact
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Elevate your school's contribution to the nation.
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Schools need practical tools that fit the way teachers and students
                already work. Noted brings quiz creation, assessments, and class
                performance insights together to support a more connected learning
                experience.
              </p>
            </div>
            <div className="group relative isolate min-h-[420px] overflow-hidden rounded-[30px] bg-slate-950 shadow-soft">
              <img
                src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1400&q=85"
                alt="Students collaborating on a classroom assignment"
                loading="lazy"
                className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/10" />
              <div className="absolute bottom-0 left-0 right-0 z-10 p-7 text-white sm:p-9">
                <h3 className="text-2xl font-bold">Made for the rhythm of a school day.</h3>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-white/85 sm:text-base">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    Create and share quizzes from lesson material.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    Review assessment results and class performance.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    Give students straightforward ways to join assessments.
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
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1800&q=85"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/60" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">For school leaders and educators</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Bring a more connected assessment workflow to your school.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-white/80">
              Get started with Noted or talk with our team about how it can fit your institution.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/signup/school-admin"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90"
              >
                Register your school
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
              >
                Talk to our team
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
