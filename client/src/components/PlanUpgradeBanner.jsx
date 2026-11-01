import { ArrowRight, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserContext } from "../context/userContext";
import useMyLimits from "../hooks/useMyLimits";

export default function PlanUpgradeBanner() {
  const { user } = useUserContext();
  const { limits } = useMyLimits();

  if (!user || user.role === "super_admin") return null;

  const plan = limits?.plan ?? user.subscriptionTier ?? "free";
  const isSchoolAdmin = user.role === "school_admin";
  const isIndependentTeacher = user.role === "teacher" && !user.schoolOwnerId;
  const isIndependentLearner = user.role === "personal_user" && !user.schoolId && !user.schoolOwnerId;
  const isSchoolManaged = isSchoolAdmin || isIndependentTeacher || isIndependentLearner;

  if (!isSchoolManaged) return null;

  const isSchoolPlan = isSchoolAdmin;
  if (isSchoolPlan ? plan === "school_premium" : plan !== "free") return null;

  const pricingAudience = isSchoolPlan ? "schools" : "teachers";
  const title = isSchoolPlan
    ? plan === "school_pro" ? "Ready for the next stage of growth?" : "Unlock more for your school"
    : isIndependentLearner ? "Unlock more tools for your learning" : "Get more out of your classroom";
  const description = isSchoolPlan
    ? plan === "school_pro"
      ? "Explore School Premium for more teacher accounts and higher classroom limits."
      : "Explore school plans for more teacher accounts, AI credits, and classroom tools."
    : "Explore Teacher Pro for higher AI limits, secure sharing, and more classroom tools.";
  const buttonLabel = isSchoolPlan ? "View school plans" : "Explore Pro plans";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-r from-brand/10 via-brand/5 to-electric/10 p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <Link
        to={`/pricing?audience=${pricingAudience}`}
        className="relative mt-4 inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:mt-0 sm:w-auto"
      >
        {buttonLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
