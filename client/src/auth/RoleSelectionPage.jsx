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
    title: "School owner / admin",
    description: "Register your school, add and manage teachers, and see school-wide results.",
    badge: "Principals & admins",
  },
  {
    to: "/signup/school-student",
    icon: GraduationCap,
    title: "Teacher with an invite code",
    description: "Join your school with the code from your school owner to create quizzes, run game shows and track your classes.",
    badge: "Educators",
  },
  {
    to: "/signup/personal",
    icon: User,
    title: "Independent student",
    description: "Use AI study tools, flashcards and focus timers to master any subject on your own.",
    badge: "Self-study",
  },
];

export default function RoleSelectionPage() {
  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col p-5 sm:p-6 md:p-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label="Noted home">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
              <AudioLines className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Noted</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center">
          <div className="mb-8 text-center md:mb-10">
            <h1 className="mb-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Create your account</h1>
            <p className="mx-auto max-w-lg text-base text-muted-foreground">
              Choose how you'll use Noted so we can set up the right experience for you.
            </p>
          </div>

          <ul className="grid gap-3 md:grid-cols-3 md:gap-5">
            {roles.map(({ to, icon: Icon, title, description, badge }) => (
              <li key={to} className="flex">
                <Link
                  to={to}
                  className="group relative flex w-full flex-row items-start gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:border-brand/50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.99] motion-safe:md:hover:-translate-y-1 md:flex-col md:gap-0 md:p-6"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft transition-colors duration-300 group-hover:bg-brand md:mb-5 md:h-14 md:w-14">
                    <Icon className="h-6 w-6 text-brand transition-colors duration-300 group-hover:text-brand-foreground md:h-7 md:w-7" aria-hidden="true" />
                  </div>

                  <div className="relative z-10 flex min-w-0 flex-1 flex-col">
                    <span className="mb-2 inline-block w-fit rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors duration-300 group-hover:bg-brand-soft group-hover:text-brand">
                      {badge}
                    </span>
                    <h2 className="mb-1.5 text-lg font-bold text-foreground transition-colors duration-300 group-hover:text-brand md:mb-2 md:text-xl">{title}</h2>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground md:mb-6">{description}</p>

                    {/* Always visible on touch screens (there's no hover there); fades in on desktop */}
                    <span className="mt-3 flex items-center text-sm font-semibold text-brand transition-all duration-300 md:mt-0 md:-translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100 md:group-focus-visible:translate-x-0 md:group-focus-visible:opacity-100">
                      Get started <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
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
        </div>
      </div>
    </AuthLayout>
  );
}
