// src/pages/auth/RoleSelectionPage.jsx
import { AudioLines, Building2, GraduationCap, User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AuthLayout from "./authLayout"; 

const roles = [
  {
    to: "/signup/school-admin",
    icon: Building2,
    title: "School Admin/Teacher",
    description: "Register your institution, manage teachers, and track school-wide performance and results.",
    badge: "For Principals & Admins"
  },
  {
    // Keeping the route as /signup/school-student so we don't break existing links, 
    // but the UI clearly says "Teacher" as requested.
    to: "/signup/school-student", 
    icon: GraduationCap,
    title: "Invite Teacher",
    description: "Join your school's portal with an invite code to create quizzes, run game shows, and track your classes.",
    badge: "For Educators"
  },
  {
    to: "/signup/personal",
    icon: User,
    title: "Independent Student", // ✅ Fixed the "Studentr" typo
    description: "Access AI study tools, flashcards, and focus timers to master any subject completely on your own.",
    badge: "For Self-Study"
  },
];

export default function RoleSelectionPage() {
  return (
    <AuthLayout>
      <div className="flex-1 flex flex-col p-6 md:p-12">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-brand-foreground shadow-sm">
            <AudioLines className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">
            Noted
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground mb-3">
              Create your account
            </h1>
            <p className="text-base text-muted-foreground max-w-lg mx-auto">
              Choose how you want to use Noted so we can set up the perfect experience for you.
            </p>
          </div>

          {/* Premium Cards Grid */}
          <div className="grid gap-5 md:grid-cols-3">
            {roles.map(({ to, icon: Icon, title, description, badge }) => (
              <Link
                key={to}
                to={to}
                className="group relative flex flex-col p-6 rounded-2xl border border-border bg-card hover:border-brand/50 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-all duration-300 overflow-hidden"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center mb-5 group-hover:bg-brand group-hover:text-brand-foreground transition-colors duration-300">
                    <Icon className="w-7 h-7 text-brand group-hover:text-brand-foreground transition-colors duration-300" aria-hidden="true" />
                  </div>
                  
                  {/* Badge */}
                  <span className="inline-block w-fit px-2.5 py-1 rounded-full bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 group-hover:bg-brand/10 group-hover:text-brand transition-colors duration-300">
                    {badge}
                  </span>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-brand transition-colors duration-300">
                    {title}
                  </h3>
                  
                  <p className="text-sm leading-relaxed text-muted-foreground mb-6 flex-1">
                    {description}
                  </p>

                  {/* Animated "Get Started" Cue */}
                  <div className="flex items-center text-sm font-semibold text-brand opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                    Get started <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-10">
            Already have an account?{" "}
            <Link to="/login" className="text-brand font-semibold hover:underline underline-offset-4 transition-all">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
