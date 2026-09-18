import {
  ArrowRight,
  BookOpenText,
  Lightbulb,
  ShieldCheck,
  Target,
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
    avatar: "https://ui-avatars.com/api/?name=Ogunleye+Kayode&background=0D8ABC&color=fff&size=128",
    isFounder: true,
  },
  {
    name: "Oyelusi Daniel",
    role: "Product & Strategy",
    bio: "Dedicated to shaping the product roadmap and ensuring every feature directly solves real student challenges.",
    avatar: "https://ui-avatars.com/api/?name=Oyelusi+Daniel&background=random&color=fff&size=128",
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
    avatar: "https://ui-avatars.com/api/?name=Sulaimon+Oluwaseun&background=random&color=fff&size=128",
  },
  {
    name: "Olabode Joshua",
    role: "Quality Assurance",
    bio: "Rigorously testing every feature to guarantee a bug-free, reliable, and smooth experience for all users.",
    avatar: "https://ui-avatars.com/api/?name=Olabode+Joshua&background=random&color=fff&size=128",
  },
  {
    name: "Okafor Adaobi",
    role: "Marketing & Communications",
    bio: "Crafting the message and vision of Noted AI to inspire students and educators across the nation.",
    avatar: "https://ui-avatars.com/api/?name=Okafor+Adaobi&background=random&color=fff&size=128",
  },
];

const impactGoals = [
  {
    icon: Users,
    value: "10,000+",
    label: "Students to empower with accessible AI learning tools.",
    color: "bg-brand/10 text-brand",
  },
  {
    icon: GraduationCap,
    value: "50+",
    label: "Partner schools to bridge the digital education gap.",
    color: "bg-electric/10 text-electric",
  },
  {
    icon: Rocket,
    value: "1 Million",
    label: "Hours of focused, stress-free study time generated.",
    color: "bg-flame/10 text-flame",
  },
];

const coreFeatures = [
  {
    icon: ScanLine,
    title: "Smart Note Scanner (OCR)",
    description: "Snap a photo of messy handwritten notes and instantly convert them into clean, editable digital text.",
  },
  {
    icon: Music,
    title: "AI Study Music & Lyrics",
    description: "Turn dense textbook chapters into catchy, rhythmic rap songs and lo-fi beats to help concepts stick.",
  },
  {
    icon: Brain,
    title: "Interactive AI Quizzes",
    description: "Instantly generate custom multiple-choice quizzes and flashcards from any topic to test your knowledge.",
  },
  {
    icon: Video,
    title: "Animated Video Storyboards",
    description: "Transform boring text into engaging, scene-by-scene visual guides and animated video prompts.",
  },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* ================= HERO / MISSION SECTION ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand mb-6">
              <Globe2 className="h-4 w-4" />
              A Nation Builder Initiative
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Making complex textbooks feel like your favorite story.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Noted AI exists to make learning clearer, more focused, and actually fun. 
              We combine thoughtful design with practical AI tools to help every student 
              learn with confidence, and help our nation build a brighter, more educated future.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-medium text-brand-foreground shadow-lg transition hover:opacity-90"
              >
                Join the movement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3.5 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Partner with us
              </Link>
            </div>
          </div>

          {/* Visual Mission Card */}
          <div className="rounded-[30px] border border-border bg-card p-6 shadow-lg lg:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-brand/5 p-5">
                <BookOpenText className="h-7 w-7 text-brand" />
                <p className="mt-4 font-display text-3xl font-bold text-foreground">
                  100%
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  focused on student comprehension
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-electric/5 p-5">
                <Sparkles className="h-7 w-7 text-electric" />
                <p className="mt-4 font-display text-3xl font-bold text-foreground">
                  AI-First
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  turning "big English" into simple concepts
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-flame/5 p-5 sm:col-span-2">
                <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  Our Core Mission
                </p>
                <p className="mt-3 text-lg leading-7 text-foreground">
                  To democratize understanding. We believe every student, regardless of 
                  background or school budget, deserves a tutor as engaging as an anime 
                  teacher and as patient as a mentor, available 24/7 to turn academic 
                  stress into academic success.
                </p>
              </div>
            </div>
          </div>
        </div>
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

          <div className="max-w-4xl mx-auto bg-card rounded-[30px] border border-border p-8 md:p-12 shadow-lg">
            <Quote className="h-10 w-10 text-brand/30 mb-4" />
            <p className="text-lg md:text-xl text-foreground leading-relaxed mb-6">
              During a particularly dense college lecture, I looked around and noticed my classmates and I 
              completely losing focus. The textbooks were full of "big English" that made simple concepts 
              feel impossible. One of my friends sighed and asked: 
              <em className="text-brand font-semibold"> "Which anime character would you wish was your class teacher?"</em>
            </p>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              That question changed everything. We realized the problem wasn't that students 
              were lazy or not smart enough. The problem was that traditional studying is <strong>boring</strong>. 
              If we could make learning feel as engaging, visual, and memorable as our favorite 
              shows, we wouldn't just be building an app. We'd be fixing how our generation learns.
            </p>
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
              className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {title}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
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
            <div className="grid gap-5">
              {impactGoals.map((goal) => (
                <div key={goal.label} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl ${goal.color}`}>
                    <goal.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-foreground">{goal.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{goal.label}</p>
                  </div>
                </div>
              ))}
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
              className={`rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg flex flex-col items-center text-center ${
                member.isFounder ? "border-brand/30 ring-1 ring-brand/10" : "border-border"
              }`}
            >
              <img 
                src={member.avatar} 
                alt={member.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-md mb-4"
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
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
        <div className="rounded-[30px] border border-border bg-gradient-to-br from-brand/5 to-electric/5 p-8 md:p-12 shadow-lg">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            Ready to transform how you study?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already using Noted AI to learn smarter, not harder. 
            Have questions or want to partner with us? Reach out to our team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-3.5 text-sm font-medium text-brand-foreground shadow-lg transition hover:opacity-90"
            >
              Get Started for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-8 py-3.5 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Contact the Team
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}