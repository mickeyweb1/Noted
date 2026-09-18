import {
  ArrowRight,
  BarChart3,
  BookCheck,
  Building2,
  ShieldCheck,
  KeyRound,
  BrainCircuit,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";

const schoolFeatures = [
  {
    icon: BookCheck,
    title: "Classroom-ready planning",
    description:
      "Keep lesson content, assessments, and study tracks organized for every class and academic term.",
  },
  {
    icon: BarChart3,
    title: "Deep learning insights",
    description:
      "Spot performance trends earlier and support students with interventions based on real progress data.",
  },
  {
    icon: ShieldCheck,
    title: "Safe and structured",
    description:
      "Give staff, students, and admin teams one transparent, secure system built for accountability.",
  },
  {
    icon: KeyRound,
    title: "Seamless admissions portal",
    description:
      "Manage new enrollments effortlessly. Generate unique, one-time invite codes to securely link new students to your school.",
  },
  {
    icon: BrainCircuit,
    title: "AI-powered student success",
    description:
      "Give your students access to our AI engine to turn their dense textbooks into engaging audio and visual summaries.",
  },
  {
    icon: Users,
    title: "Parent-teacher connection",
    description:
      "Keep families in the loop with clear, automated progress snapshots and study habit reports.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Register your institution",
    description: "Set up your school's profile, configure your academic terms, and customize your admin dashboard in minutes.",
  },
  {
    step: "02",
    title: "Invite & enroll students",
    description: "Use our secure admissions portal to approve new students and generate one-time invite codes for them to join.",
  },
  {
    step: "03",
    title: "Monitor & empower",
    description: "Watch your students engage with AI study tools, track their focus hours, and celebrate their academic growth.",
  },
];

export default function SchoolPage() {
  return (
    <MarketingLayout>
      {/* ================= HERO SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/8 px-3 py-1.5 text-sm font-medium text-brand mb-6">
              <Building2 className="h-4 w-4" />
              For Educational Institutions
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Give your school a smarter study ecosystem.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Noted brings together classroom planning, AI revision support, and
              student tracking so schools can help learners stay consistent, 
              reduce burnout, and improve national exam outcomes.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/signup/school-admin"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90"
              >
                Register your school
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Book a demo
              </Link>
            </div>
            
            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {["Secure data", "Easy onboarding", "24/7 AI access"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="rounded-[30px] border border-border bg-card p-6 shadow-soft lg:p-8">
            <div className="rounded-[24px] border border-border bg-gradient-to-br from-brand-soft via-background to-electric-soft p-5">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/90 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    School overview
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">
                    Westfield Academy
                  </p>
                </div>
                <div className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Live
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { value: "94%", label: "engagement" },
                  { value: "18", label: "active classes" },
                  { value: "2.4x", label: "study consistency" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-border bg-background p-4 text-center"
                  >
                    <p className="font-display text-2xl font-bold text-foreground">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Mini activity feed inside mockup */}
              <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">RECENT ACTIVITY</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">Grade 10 Biology AI Summaries</span>
                    <span className="text-xs text-brand font-medium">+42 generated</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">New student admissions approved</span>
                    <span className="text-xs text-brand font-medium">+12 enrolled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS (ADMIN JOURNEY) ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              The Admin Journey
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Onboard your entire school in 3 simple steps.
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
                  <h3 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
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
            Platform Capabilities
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to run a modern, digital school.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {schoolFeatures.map(({ icon: Icon, title, description }) => (
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
                By adopting Noted, your school isn't just buying software; you are 
                joining a national movement to modernize education. You are giving 
                your students the exact same AI-powered advantages as students in 
                top-tier international academies, right here at home.
              </p>
            </div>
            <div className="rounded-[30px] border border-border bg-card p-8 shadow-soft">
              <h3 className="text-xl font-bold text-foreground mb-4">Why schools choose Noted:</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-foreground"><strong>Higher Pass Rates:</strong> AI revision tools directly improve exam readiness.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-foreground"><strong>Reduced Teacher Burnout:</strong> Automate routine tracking so teachers can focus on mentoring.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-foreground"><strong>Digital Leadership:</strong> Position your institution as a forward-thinking pioneer in EdTech.</span>
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
            <Building2 className="h-10 w-10 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your school's study culture?
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Join the network of forward-thinking schools using Noted to build 
              smarter, happier, and more successful students.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup/school-admin"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-brand shadow-lg transition hover:bg-white/90"
              >
                Register your school
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