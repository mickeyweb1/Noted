import { 
  ArrowRight, 
  Mail, 
  MapPin, 
  Phone, 
  MessageSquare, 
  School, 
  GraduationCap, 
  Users 
} from "lucide-react";
import MarketingLayout from "./MarketingLayout";

// ==========================================
// EDIT YOUR CONTACT DETAILS HERE LATER
// ==========================================
const CONTACT_INFO = [
  { 
    icon: Mail, 
    title: "Email Us", 
    detail: "hello@notedstudy.com", // <-- CHANGE THIS LATER
    description: "We usually reply within 24 hours."
  },
  { 
    icon: Phone, 
    title: "Call Us", 
    detail: "+234 (0) 800 000 0000", // <-- CHANGE THIS LATER
    description: "Mon-Fri from 8am to 5pm WAT."
  },
  { 
    icon: MapPin, 
    title: "Our Office", 
    detail: "Lagos, Nigeria", // <-- CHANGE THIS LATER
    description: "Building the future of education from home."
  },
];

export default function ContactPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Get in Touch
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Let’s build a smarter learning experience.
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Whether you are a school looking to partner with us, a parent with 
            questions, or a student who needs help, we are here to listen.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          
          {/* LEFT SIDE: Contact Info & Visual */}
          <div className="space-y-6">
            <div className="rounded-[30px] border border-border bg-card p-6 shadow-soft lg:p-8">
              {CONTACT_INFO.map(({ icon: Icon, title, detail, description }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-muted/30 p-4 mb-4 last:mb-0 transition hover:bg-muted/50"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-1 font-medium text-brand">{detail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Placeholder for Team Picture / Illustration */}
            <div className="rounded-[30px] border border-border bg-gradient-to-br from-brand-soft to-electric-soft p-6 text-center">
              <MessageSquare className="h-12 w-12 text-brand mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground">Prefer a face-to-face chat?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                We are currently scheduling demo calls with forward-thinking schools. 
                Book a 15-minute intro call with our team.
              </p>
              {/* You can replace this button with an actual image later! */}
              <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-medium text-foreground border border-border shadow-sm hover:bg-muted transition">
                Book a Demo Call
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {/* 
              NOTE FOR LATER: 
              You can replace the "Book a Demo Call" div above with an <img> tag 
              showing a picture of you and your teammate once you get it! 
              Example: <img src="/team-photo.jpg" alt="The Noted Team" className="rounded-2xl w-full" />
            */}
          </div>

          {/* RIGHT SIDE: Contact Form */}
          <form className="rounded-[30px] border border-border bg-card p-6 shadow-soft lg:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  First name
                </label>
                <input
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Last name
                </label>
                <input
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                type="email"
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all"
                placeholder="you@example.com"
              />
            </div>

            {/* NEW: Role Dropdown (Makes it look very professional) */}
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-foreground">
                I am a...
              </label>
              <select className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all">
                <option value="">Select your role...</option>
                <option value="student">Student</option>
                <option value="parent">Parent / Guardian</option>
                <option value="school_admin">School Administrator / Teacher</option>
                <option value="partner">Potential Partner / Sponsor</option>
              </select>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Message
              </label>
              <textarea
                rows={5}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring transition-all resize-none"
                placeholder="Tell us how we can help your school, family, or learning journey..."
              />
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90"
            >
              Send message
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}