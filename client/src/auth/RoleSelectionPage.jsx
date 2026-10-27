import { AudioLines, Building2, GraduationCap, User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AuthLayout from "./authLayout";
import { ThemeToggle } from "../components/themeToggle";

// The routes keep their old paths so existing links don't break:
// /signup/school-student is the page where an invited TEACHER joins with a school code.
const roles = [
  {
    to: "/signup/school-admin",
    icon: Building2,
    title: "School admin / Teacher",
    description: "Register your school, add and manage teachers, and see school-wide results.",
    badge: "Principals & admins",
    image: "photo-1509062522246-3755977927d7",
    imageAlt: "Teacher leading a classroom lesson",
  },
  {
    to: "/signup/school-student",
    icon: GraduationCap,
    title: "Teacher with an invite code",
    description: "Join your school with the code from your school owner to create quizzes, run game shows and track your classes.",
    badge: "Educators",
    image: "photo-1529390079861-591de354faf5",
    imageAlt: "Students studying and reviewing classwork together",
  },
  {
    to: "/signup/personal",
    icon: User,
    title: "Student",
    description: "Use AI study tools, flashcards and focus timers to master any subject on your own.",
    badge: "Self-study",
    image: "photo-1434030216411-0b793f4b4173",
    imageAlt: "Student's notebook and study materials on a desk",
  },
];

export default function RoleSelectionPage() {
  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col p-5 sm:p-6 md:p-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden" aria-label="Noted home">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
              <AudioLines className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Noted</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center">
          <div className="mb-8 text-center md:mb-10">
            <h1 className="mb-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Get started with Noted</h1>
            <p className="mx-auto max-w-lg text-base text-muted-foreground">
              Choose the option that best describes you to continue.
            </p>
          </div>

          <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
            {roles.map(({ to, icon: Icon, title, description, badge, image, imageAlt }) => (
              <li key={to} className="flex min-w-0">
                <Link
                  to={to}
                  className="landing-interactive group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.99]"
                >
                  <div className="relative h-32 overflow-hidden bg-muted sm:h-36">
                    <img
                      src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=80`}
                      alt={imageAlt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {badge}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5 sm:p-5">
                    <h2 className="text-lg font-bold text-foreground transition-colors group-hover:text-brand">{title}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
                    <span className="mt-5 inline-flex items-center justify-between border-t border-border pt-4 text-sm font-semibold text-brand">
                      Continue
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-center text-sm text-muted-foreground md:mt-10">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-brand underline-offset-4 transition-all hover:underline">Sign in here</Link>
          </p>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Photos via{" "}
            <a href="https://unsplash.com/license" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
