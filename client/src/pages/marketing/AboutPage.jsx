import {
  ArrowRight,
  BookOpenText,
  Sparkles,
  Globe2,
  Rocket,
  Users,
  GraduationCap,
  Quote,
  Brain,
  Music,
  Video,
  ScanLine,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";

// ==========================================
// THE NATION BUILDER TEAM
// Edit the 'role' and 'bio' for each member as needed.
// To add real photos, replace the 'avatar' URL with your image path (e.g., "/images/kayode.jpg")
// ==========================================
const teamMembers = [
  {
    name: "Ogunleye Kayode",
    role: "Founder & Lead Developer",
    bio: "The technical architect behind Noted AI. Passionate about using technology to democratize education and make learning accessible to every student.",
    avatar: "/images/kayode.jpeg",
    isFounder: true,
  },
  {
    name: "Oyelusi Daniel",
    role: "Product & Strategy",
    bio: "Dedicated to shaping the product roadmap and ensuring every feature directly solves real student challenges.",
    avatar: "/images/oyelusi-daniel.jpg",
  },
  {
    name: "Fakorede Oluwafeyishikemi",
    role: "Research & Development",
    bio: "Focused on gathering student feedback and researching the best pedagogical methods to integrate into our AI models.",
    avatar: "https://ui-avatars.com/api/?name=Fakorede+Oluwafeyishikemi&background=random&color=fff&size=128",
  },
  {
    name: "Akeasa Samuel",
    role: "Content & Curriculum",
    bio: "Ensures that all AI-generated content remains accurate, educational, and perfectly aligned with academic standards.",
    avatar: "https://ui-avatars.com/api/?name=Akeasa+Samuel&background=random&color=fff&size=128",
  },
  {
    name: "Korole Israel",
    role: "UI/UX Design",
    bio: "Crafting the intuitive, engaging, and accessible interfaces that make studying with Noted AI a seamless experience.",
    avatar: "https://ui-avatars.com/api/?name=Korole+Israel&background=random&color=fff&size=128",
  },
  {
    name: "Akhibi Owen",
    role: "Community & Outreach",
    bio: "Building bridges with student communities and educational institutions to spread the word about accessible learning.",
    avatar: "https://ui-avatars.com/api/?name=Akhibi+Owen&background=random&color=fff&size=128",
  },
  {
    name: "Sulaimon Oluwaseun",
    role: "Operations & Logistics",
    bio: "Keeping the project on track, managing resources, and ensuring the team has everything needed to build and scale.",
    avatar: "/images/seun.jpg",
  },
  {
    name: "Olabode Joshua",
    role: "Quality Assurance",
    bio: "Rigorously testing every feature to guarantee a bug-free, reliable, and smooth experience for all users.",
    avatar: "/images/olabode-joshua.png",
  },
  {
    name: "Okafor Adaobi",
    role: "Marketing & Communications",
    bio: "Crafting the message and vision of Noted AI to inspire students and educators across the nation.",
    avatar: "https://ui-avatars.com/api/?name=Okafor+Adaobi&background=random&color=fff&size=128",
  },
];

const coreFeatures = [
  {
    icon: ScanLine,
    title: "Smart Note Scanner (OCR)",
    description: "Snap a photo of messy handwritten notes and instantly convert them into clean, editable digital text.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Student's handwritten notes open on a desk",
  },
  {
    icon: Music,
    title: "AI Study Music & Lyrics",
    description: "Turn dense textbook chapters into catchy, rhythmic rap songs and lo-fi beats to help concepts stick.",
    image: "photo-1516280440614-37939bbacd81",
    imageAlt: "Singer performing with a microphone",
  },
  {
    icon: Brain,
    title: "Interactive AI Quizzes",
    description: "Instantly generate custom multiple-choice quizzes and flashcards from any topic to test your knowledge.",
    image: "photo-1523240795612-9a054b0db644",
    imageAlt: "Students studying together around a table",
  },
  {
    icon: Video,
    title: "Animated Video Storyboards",
    description: "Transform boring text into engaging, scene-by-scene visual guides and animated video prompts.",
    image: "photo-1509062522246-3755977927d7",
    imageAlt: "Teacher leading a classroom lesson",
  },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* ================= HERO / MISSION SECTION ================= */}
      <section className="relative isolate flex min-h-[min(680px,calc(100svh-4rem))] overflow-hidden bg-slate-950">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2000&q=85"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center motion-safe:animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/10" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl landing-enter">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Globe2 className="h-4 w-4" />
              A Nation Builder Initiative
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
              Making complex textbooks feel like your favorite story.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Noted exists to make learning clearer, more focused, and more engaging.
              We combine thoughtful design with practical AI tools to help students
              learn with confidence.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90"
              >
                Join the movement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
              >
                Partner with us
              </Link>
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

      {/* ================= THE ORIGIN STORY ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              How it started
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              It started with a moment of realization in class.
            </h2>
          </div>

          <div className="grid overflow-hidden rounded-[30px] border border-border bg-card shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
            <div className="group relative min-h-72 overflow-hidden bg-slate-900 lg:min-h-full">
              <img
                src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80"
                alt="A student taking notes while studying"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              <a
                href="https://unsplash.com/license"
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-4 left-5 text-xs text-white/80 underline underline-offset-2"
              >
                Photo via Unsplash
              </a>
            </div>
            <div className="p-7 sm:p-10 lg:p-12">
              <Quote className="mb-5 h-9 w-9 text-brand/40" />
              <p className="text-lg leading-relaxed text-foreground sm:text-xl">
                During a particularly dense college lecture, I looked around and noticed my classmates and I
                completely losing focus. The textbooks were full of "big English" that made simple concepts
                feel impossible. One of my friends sighed and asked:
                <em className="font-semibold text-brand"> "Which anime character would you wish was your class teacher?"</em>
              </p>
              <p className="mt-5 leading-relaxed text-muted-foreground sm:text-lg">
                That question changed everything. We realized the problem wasn't that students
                were lazy or not smart enough. If we could make learning feel as engaging,
                visual, and memorable as our favorite shows, we wouldn't just be building an app.
                We'd be rethinking how our generation learns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CORE FEATURES ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            What we build
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tools designed for the modern student.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {coreFeatures.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="landing-interactive group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
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
                <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= NATIONAL VISION ================= */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
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
                we are leveling the playing field for every student.
              </p>
            </div>
            <div className="group relative isolate min-h-[420px] overflow-hidden rounded-[30px] bg-slate-950 shadow-soft">
              <img
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=85"
                alt="Students learning together in a classroom"
                loading="lazy"
                className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-slate-950/10" />
              <div className="absolute bottom-0 left-0 right-0 p-7 text-white sm:p-9">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                  Learning without barriers
                </p>
                <h3 className="mt-3 max-w-lg text-2xl font-bold sm:text-3xl">
                  Clear explanations should be within reach for every learner.
                </h3>
                <p className="mt-3 max-w-lg leading-7 text-white/80">
                  We are building practical study tools that help make difficult material
                  easier to approach, understand, and revisit.
                </p>
              </div>
              <a
                href="https://unsplash.com/license"
                target="_blank"
                rel="noreferrer"
                className="absolute right-4 top-4 text-xs text-white/75 underline underline-offset-2"
              >
                Photo via Unsplash
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= THE TEAM SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            The Builders
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Driven by one vision, built by a dedicated team.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Noted AI is a collaborative effort. Meet the passionate individuals working behind the scenes to make this nation builder initiative a reality.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className={`landing-interactive rounded-3xl border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col items-center text-center ${
                member.isFounder ? "border-brand/30 ring-1 ring-brand/10" : "border-border"
              }`}
            >
              <img
                src={member.avatar}
                alt={member.name}
                loading="lazy"
                decoding="async"
                className="mb-4 h-24 w-24 rounded-full border-4 border-background object-cover shadow-md"
              />
              <h3 className="text-xl font-bold text-foreground">{member.name}</h3>
              <p className={`text-sm font-medium mb-3 ${member.isFounder ? "text-brand" : "text-muted-foreground"}`}>
                {member.role}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {member.bio}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CALL TO ACTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="landing-interactive group relative isolate overflow-hidden rounded-[30px] bg-slate-950 px-6 py-14 text-center shadow-2xl sm:px-10 sm:py-16">
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1800&q=85"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/60" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">Start learning differently</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform how you study?
            </h2>
            <p className="mx-auto mb-8 mt-4 max-w-2xl text-lg leading-7 text-white/80">
              Explore study tools designed to make challenging material easier to understand.
              Have questions or want to partner with us? Reach out to our team.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90"
              >
                Get started for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
              >
                Contact the team
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
