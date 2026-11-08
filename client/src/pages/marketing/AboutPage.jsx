import {
  ArrowRight,
  Globe2,
  Quote,
  Brain,
  Music,
  Video,
  ScanLine,
  Building2,
  BookOpen,
  Headphones,
  ClipboardCheck,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";
import UnsplashCredit from "../../components/UnsplashCredit";

// Replace the avatar paths with the team's approved photos when available.
const teamMembers = [
  {
    name: "Ogunleye Kayode",
    role: "Founder & Lead Developer",
    bio: "Leads the product's technical direction and development, with a focus on using practical technology to make learning more accessible and engaging.",
    avatar: "/images/kayode.jpeg",
    isFounder: true,
  },
  {
    name: "Oyelusi Daniel",
    role: "Product & Strategy",
    bio: "Contributes to product planning and helps ensure that new features address real needs in the classroom.",
    avatar: "/images/oyelusi-daniel.jpg",
  },
  {
    name: "Fakorede Oluwafeyishikemi",
    role: "Research & Development",
    bio: "Gathers feedback and explores learning approaches that can make Noted AI more useful for students and teachers.",
    avatar:
      "https://ui-avatars.com/api/?name=Fakorede+Oluwafeyishikemi&background=random&color=fff&size=256",
  },
  {
    name: "Akeasa Samuel",
    role: "Content & Curriculum",
    bio: "Supports the quality of educational content and helps keep learning materials clear, relevant, and aligned with classroom needs.",
    avatar:
      "https://ui-avatars.com/api/?name=Akeasa+Samuel&background=random&color=fff&size=256",
  },
  {
    name: "Sulaimon Oluwaseun",
    role: "Nation Builder Team Lead",
    bio: "Coordinates the Nation Builder team and supports the planning and day-to-day work needed to move the initiative forward.",
    avatar: "/images/seun.jpg",
  },
  {
    name: "Olabode Joshua",
    role: "Co-Developer & Quality Assurance",
    bio: "Contributes to development and tests features to identify issues and improve the reliability of the platform.",
    avatar: "/images/olabode-joshua.png",
  },
  {
    name: "Akhibi Owen",
    role: "Community & Outreach",
    bio: "Builds relationships with students and educational communities and helps introduce Noted AI to potential users.",
    avatar:
      "https://ui-avatars.com/api/?name=Akhibi+Owen&background=random&color=fff&size=256",
  },
  {
    name: "Okafor Adaobi",
    role: "Product Advisor",
    bio: "Provides feedback on product ideas and helps evaluate which improvements will create the most value for students and teachers.",
    avatar:
      "https://ui-avatars.com/api/?name=Okafor+Adaobi&background=random&color=fff&size=256",
  },
];

// Use real school logos here when the schools have approved their use.
// Until then, the page displays initials instead of presenting placeholder images as official logos.
const schools = [
  { name: "Petra School Ota", initials: "PS" },
  { name: "God Pride School", initials: "GP" },
  { name: "Elite Foundation School", initials: "EF" },
  { name: "College - Eminence Schools Ota", initials: "ES" },
];

const coreFeatures = [
  {
    icon: ScanLine,
    title: "Smart Note Scanner",
    description:
      "Turn photos of handwritten or printed notes into digital text that you can use to create and review study materials.",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Study notes and writing materials on a desk",
  },
  {
    icon: MessageCircle,
    title: "AI Study Companion",
    description:
      "Ask questions about difficult topics and get explanations that help you work through concepts step by step.",
    image: "photo-1523580494863-6f3031224c94",
    imageAlt: "Students working together in a learning environment",
  },
  {
    icon: BookOpen,
    title: "Summaries & Study Materials",
    description:
      "Break long notes and topics into clearer summaries and organized materials that are easier to revisit.",
    image: "photo-1456513080510-7bf3a84b82f8",
    imageAlt: "Open books and study materials",
  },
  {
    icon: Brain,
    title: "Quizzes & Flashcards",
    description:
      "Practise what you have learned with topic-based quizzes and flashcards designed to help you check your understanding.",
    image: "photo-1523240795612-9a054b0db644",
    imageAlt: "Students studying together around a table",
  },
  {
    icon: Headphones,
    title: "Audio & Music Learning",
    description:
      "Explore study content through audio, podcasts, and music-based learning formats that offer another way to revise.",
    image: "photo-1516280440614-37939bbacd81",
    imageAlt: "Microphone in a recording environment",
  },
  {
    icon: Video,
    title: "Visual Learning Guides",
    description:
      "Turn topics into structured visual storyboards that help break ideas into scenes and easier-to-follow steps.",
    image: "photo-1509062522246-3755977927d7",
    imageAlt: "Teacher leading a classroom lesson",
  },
  {
    icon: ClipboardCheck,
    title: "CBT & Teacher Tools",
    description:
      "Help teachers prepare computer-based tests, organize assessments, issue student access codes, and review performance.",
    image: "photo-1501290741922-a9c6e9d4a1f3",
    imageAlt: "Student completing an assessment at a desk",
  },
  {
    icon: Globe2,
    title: "Offline-friendly CBT",
    description:
      "For supported assessments, students can continue working through temporary network interruptions, with saved progress available to sync when the connection returns.",
    image: "photo-1516321318423-f06f85e504b3",
    imageAlt: "A student working on a laptop",
  },
];

const unsplashImage = (photoId, width = 1400) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=85`;

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* HERO */}
      <section className="relative isolate flex min-h-[min(680px,calc(100svh-4rem))] overflow-hidden bg-slate-950">
        <img
          src={unsplashImage("photo-1522202176988-66273c2fd55f", 2000)}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center motion-safe:animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/10" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="landing-enter max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              A Nation Builder Initiative
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/75">
              One Note. Many Ways to Learn.
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
              Making learning clearer, more engaging, and more accessible.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Noted AI brings practical AI-powered study and classroom tools into
              one platform. Students can explore topics in different ways, while
              teachers can prepare learning activities and assessments more
              efficiently.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Get started for free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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

      {/* WHY WE STARTED */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Why we started
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Learning should not feel harder than it needs to be.
            </h2>
            <p className="mt-4 text-lg leading-7 text-muted-foreground">
              A difficult topic can become easier to approach when students have
              the right explanation, tools, and opportunities to practise.
            </p>
          </div>

          <div className="grid overflow-hidden rounded-[30px] border border-border bg-card shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
            <div className="group relative min-h-72 overflow-hidden bg-slate-900 lg:min-h-full">
              <img
                src={unsplashImage("photo-1434030216411-0b793f4b4173", 1200)}
                alt="A student reviewing notes while studying"
                loading="lazy"
                decoding="async"
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
              <Quote className="mb-5 h-9 w-9 text-brand/50" aria-hidden="true" />
              <p className="text-lg leading-relaxed text-foreground sm:text-xl">
                The idea behind Noted grew from a familiar classroom challenge:
                students can struggle to stay engaged when learning materials
                feel difficult to understand or remember. During one of those
                conversations, a friend asked:
                <em className="font-semibold text-brand">
                  {" "}
                  “Which anime character would you wish was your class teacher?”
                </em>
              </p>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                It got us thinking about how learning could become more
                interactive, visual, and memorable. Noted AI is our effort to
                bring different ways of learning together and give students and
                teachers practical tools they can use in and beyond the
                classroom.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            What Noted AI offers
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tools for learning and teaching.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            From understanding a difficult topic to preparing a classroom
            assessment, Noted AI brings useful learning tools into one place.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {coreFeatures.map(({ icon: Icon, title, description, image, imageAlt }) => (
            <article
              key={title}
              className="landing-interactive group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-44 overflow-hidden bg-muted">
                <img
                  src={unsplashImage(image, 900)}
                  alt={imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                <div className="absolute bottom-4 left-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/95 text-brand shadow-soft">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-5 text-right text-xs text-muted-foreground">
          <UnsplashCredit plural />
        </p>
      </section>

      {/* SCHOOLS */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Our school community
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Working with schools to improve learning.
            </h2>
            <p className="mt-4 text-lg leading-7 text-muted-foreground">
              We value the schools and educators exploring Noted AI with us.
              Their experiences and feedback help guide how the platform grows.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {schools.map((school) => (
              <div
                key={school.name}
                className="landing-interactive flex min-h-44 flex-col items-center justify-center rounded-3xl border border-border bg-card p-7 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-xl font-bold tracking-wide text-brand"
                  aria-hidden="true"
                >
                  {school.initials}
                </div>
                <h3 className="text-base font-bold leading-6 text-foreground">
                  {school.name}
                </h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  School community
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUR VISION */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Our vision
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              More students should have access to useful learning support.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Many students need extra explanations and practice outside the
              classroom, but access to personal tutoring and additional
              learning resources can be limited.
            </p>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              We are building Noted AI to make study support easier to access
              through summaries, explanations, quizzes, audio learning, and
              tools that help teachers manage classroom activities.
            </p>
          </div>

          <div className="group relative isolate min-h-[420px] overflow-hidden rounded-[30px] bg-slate-950 shadow-soft">
            <img
              src={unsplashImage("photo-1509062522246-3755977927d7", 1400)}
              alt="A teacher guiding students in a classroom"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-slate-950/10" />
            <div className="absolute bottom-0 left-0 right-0 z-10 p-7 text-white sm:p-9">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                Learning without unnecessary barriers
              </p>
              <h3 className="mt-3 max-w-lg text-2xl font-bold sm:text-3xl">
                Better learning support, one useful tool at a time.
              </h3>
              <p className="mt-3 max-w-lg leading-7 text-white/80">
                Our goal is to help students understand more confidently and
                help educators spend less time on repetitive preparation.
              </p>
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
      </section>

      {/* TEAM */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Meet the team
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              The people building Noted AI.
            </h2>
            <p className="mt-4 text-lg leading-7 text-muted-foreground">
              Noted AI is developed by a team contributing across technology,
              research, content, product planning, and community outreach.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teamMembers.map((member) => (
              <article
                key={member.name}
                className={`landing-interactive flex flex-col items-center rounded-3xl border bg-card p-6 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  member.isFounder
                    ? "border-brand/30 ring-1 ring-brand/10"
                    : "border-border"
                }`}
              >
                <img
                  src={member.avatar}
                  alt={`${member.name}`}
                  loading="lazy"
                  decoding="async"
                  className="mb-4 h-24 w-24 rounded-full border-4 border-background bg-muted object-cover shadow-md"
                />
                <h3 className="text-lg font-bold text-foreground">
                  {member.name}
                </h3>
                <p
                  className={`mb-3 mt-1 text-sm font-medium ${
                    member.isFounder ? "text-brand" : "text-muted-foreground"
                  }`}
                >
                  {member.role}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {member.bio}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="landing-interactive group relative isolate overflow-hidden rounded-[30px] bg-slate-950 px-6 py-14 text-center shadow-2xl sm:px-10 sm:py-16">
          <img
            src={unsplashImage("photo-1523240795612-9a054b0db644", 1800)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/65" />

          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">
              Start learning differently
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Make your next learning session count.
            </h2>
            <p className="mx-auto mb-8 mt-4 max-w-2xl text-lg leading-7 text-white/80">
              Explore tools that help make difficult topics easier to study.
              Are you an educator or school interested in using Noted AI? Get in
              touch with our team.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Get started for free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
