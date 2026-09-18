// src/pages/auth/RoleSelectionPage.jsx
import { AudioLines, Building2, GraduationCap, User } from "lucide-react";
import { Link } from "react-router-dom";
import AuthLayout from "./authLayout"; 

const roles = [
  {
    to: "/signup/school-admin",
    icon: Building2,
    title: "School Admin",
    description: "Register your school and manage students.",
  },
  {
    to: "/signup/school-student",
    icon: GraduationCap,
    title: "School Student",
    description: "Join your school's portal with an invite code.",
  },
  {
    to: "/signup/personal",
    icon: User,
    title: "Personal User",
    description: "Use AI study tools independently.",
  },
];

export default function RoleSelectionPage() {
  return (
    <AuthLayout>
      <div className="flex-1 flex flex-col p-6 md:p-12">
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-brand text-brand-foreground">
            <AudioLines className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">
            Noted
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground mb-2">
              Create your account
            </h1>
            <p className="text-muted-foreground">
              Choose how you want to use Noted to get started.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {roles.map(({ to, icon: Icon, title, description }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center p-6 rounded-xl border border-input bg-background hover:border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center mb-4 group-hover:bg-brand/20 transition-colors">
                  <Icon className="w-6 h-6 text-brand" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-xs text-center text-muted-foreground">
                  {description}
                </p>
              </Link>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link to="/login" className="text-brand font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
