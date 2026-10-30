import { Check, X, Crown, Users, Zap, Star, Building2, Sparkles, Shield, Clock } from "lucide-react";
import { useUserContext } from "../context/userContext"; 
import { useNavigate } from "react-router-dom";
import MarketingLayout from "./marketing/MarketingLayout";

const teacherTiers = [
  {
    name: "Free",
    price: "$0",
    oldPrice: null,
    period: "forever",
    description: "Perfect for trying out Noted AI.",
    icon: Zap,
    color: "text-gray-500",
    features: [
      "Max 40 AI questions per quiz",
      "Max 25 student codes per test",
      "Max 5 AI tests per week",
      "Unlimited manual questions",
      "Basic tab-switch tracking",
      "Basic CSV export",
    ],
    notIncluded: [
      '"Powered by Noted AI" watermark',
      "No Game Show mode",
      "No offline quiz support",
      "No secure result sharing",
    ],
    cta: "Current Plan",
    disabled: true,
    planId: "free",
  },
  {
    name: "Teacher Pro",
    price: "$5",
    oldPrice: "$8",
    period: "/month",
    description: "For individual teachers who want premium tools.",
    icon: Crown,
    color: "text-brand",
    popular: true,
    discountBadge: "Save 37%",
    features: [
      "Max 60 AI questions per quiz",
      "Max 40 student codes per test",
      "Up to 12 Game Shows per month",
      "Unlimited manual questions",
      "Advanced CSV Grade Export",
      "NO Watermark on quizzes",
      "Priority email support",
      "🔒 Secure Result Sharing with colleagues",
      "📶 Offline Quiz Support (auto-syncs)",
      "🛡️ Advanced anti-cheating (tab tracking)",
    ],
    notIncluded: [],
    cta: "Upgrade to Pro",
    disabled: false,
    planId: "teacher_pro",
  },
  {
    name: "Teacher Premium",
    price: "$10",
    oldPrice: "$15",
    period: "/month",
    description: "For power users who need unlimited access.",
    icon: Star,
    color: "text-purple-600",
    discountBadge: "Save 33%",
    features: [
      "UNLIMITED AI questions per quiz",
      "Max 100 student codes per test",
      "UNLIMITED Game Shows",
      "Unlimited manual questions",
      "Advanced CSV Grade Export",
      "NO Watermark on quizzes",
      "Early access to new features (e.g., AI Proctoring)",
      "24-hour priority support",
      "🔒 Secure Result Sharing with colleagues",
      "📶 Offline Quiz Support (auto-syncs)",
      "📋 Duplicate Quiz feature",
      "📊 Question Quality Insights",
    ],
    notIncluded: [],
    cta: "Upgrade to Premium",
    disabled: false,
    planId: "teacher_premium",
  },
];

const schoolTiers = [
  {
    name: "School Starter",
    price: "$20",
    period: "/month",
    description: "Covers up to 4 teachers. Best for small schools.",
    icon: Building2,
    color: "text-blue-600",
    features: [
      "OWNER: UNLIMITED questions, codes, and game shows",
      "TEACHERS: Max 50 AI questions, 30 codes, 8 Game Shows/mo",
      "School Overview Dashboard (view all teacher results)",
      "Advanced CSV Grade Export for the whole school",
      "NO Watermark on any quiz",
      "🔒 Secure Result Sharing across the school",
      "📶 Offline Quiz Support for all students",
      "$4/month per extra teacher (beyond 4)",
    ],
    notIncluded: [],
    cta: "Upgrade to Starter",
    disabled: false,
    planId: "school_starter",
  },
  {
    name: "School Pro",
    price: "$50",
    period: "/month",
    description: "Covers up to 13 teachers. Perfect for growing schools.",
    icon: Crown,
    color: "text-brand",
    popular: true,
    discountBadge: "Best Value",
    features: [
      "OWNER: UNLIMITED + Advanced Analytics & Reporting",
      "TEACHERS: Max 80 AI questions, 50 codes, 15 Game Shows/mo",
      "School Overview Dashboard",
      "Export all school data",
      "NO Watermark on any quiz",
      "Priority support",
      "🔒 Secure Result Sharing & Offline Support",
      "📊 School-wide Question Quality Insights",
      "$3/month per extra teacher (beyond 13)",
    ],
    notIncluded: [],
    cta: "Upgrade to Pro",
    disabled: false,
    planId: "school_pro",
  },
  {
    name: "School Premium",
    price: "$100",
    period: "/month",
    description: "Covers up to 30 teachers. For large institutions.",
    icon: Star,
    color: "text-purple-600",
    features: [
      "OWNER: UNLIMITED + API Access + Dedicated Manager",
      "TEACHERS: Max 150 AI questions, 100 codes, 30 Game Shows/mo",
      "Custom branding (White-label option)",
      "Advanced Analytics & Reporting",
      "NO Watermark on any quiz",
      "24/7 Priority Support",
      "🔒 Secure Result Sharing & Offline Support",
      "🛡️ Advanced AI Proctoring (Coming Soon)",
      "$3/month per extra teacher (beyond 30)",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    disabled: false,
    planId: "school_premium",
  },
];

export default function PricingPage() {
  const { user } = useUserContext();
  const navigate = useNavigate();

  const handleUpgrade = (planId) => {
    if (user?.subscriptionTier === planId) {
      return;
    }
    // TODO: Integrate Paystack/Stripe here
    alert(`Redirecting to secure checkout for: ${planId.replace("_", " ").toUpperCase()}...`);
  };

  const isCurrentPlan = (planId) => user?.subscriptionTier === planId;

  const renderSection = (title, subtitle, tiers) => (
    <div className="mb-16">
      <div className="mx-auto max-w-2xl text-center mb-10">
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          {subtitle}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex min-w-0 flex-col rounded-2xl border bg-card p-6 shadow-soft transition-all hover:shadow-lg hover:-translate-y-1 sm:p-7 ${
              tier.popular ? "border-brand ring-2 ring-brand/20" : "border-border"
            }`}
          >
            {/* Discount Badge on Top */}
            {tier.popular && tier.discountBadge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-brand-foreground shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  {tier.discountBadge}
                </span>
              </div>
            )}

            <div className="mb-4">
              <div className={`flex items-center gap-2 ${tier.color}`}>
                <tier.icon className="h-6 w-6" />
                <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
            </div>

            {/* Price with Strikethrough for Discount */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                {tier.oldPrice && (
                  <span className="text-xl font-medium text-muted-foreground line-through decoration-red-500/50">
                    {tier.oldPrice}
                  </span>
                )}
                <span className="text-5xl font-extrabold text-foreground">{tier.price}</span>
              </div>
              <span className="text-base font-medium text-muted-foreground">{tier.period}</span>
            </div>

            <ul className="mb-8 flex-1 space-y-3 text-left">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
              {tier.notIncluded && tier.notIncluded.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground opacity-60">
                  <X className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(tier.planId)}
              disabled={tier.disabled || isCurrentPlan(tier.planId)}
              className={`w-full rounded-xl px-4 py-3.5 text-sm font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                isCurrentPlan(tier.planId)
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : tier.popular
                  ? "bg-brand text-brand-foreground hover:bg-brand/90 hover:shadow-brand/25"
                  : "bg-foreground text-background hover:bg-foreground/90"
              }`}
            >
              {isCurrentPlan(tier.planId) ? "Current Plan" : tier.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          
          {/* Page Header */}
          <div className="mx-auto max-w-3xl text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Plans for every classroom</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              Choose the plan that fits your classroom or entire school. Upgrade or downgrade at any time. 
              <span className="block mt-2 font-semibold text-brand">🎉 Limited Time Discount: Save up to 37% on Teacher Plans!</span>
            </p>
          </div>

          {/* Section 1: Teacher Plans */}
          {renderSection(
            "For Individual Teachers",
            "Powerful tools to create, manage, and grade quizzes effortlessly, even offline.",
            teacherTiers
          )}

          {/* Divider */}
          <div className="relative mb-16">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Or scale up for your entire school
              </span>
            </div>
          </div>

          {/* Section 2: School Plans */}
          {renderSection(
            "For Schools & Administrators",
            "Centralized management, advanced analytics, and dedicated support for your institution.",
            schoolTiers
          )}

        </div>
      </div>
    </MarketingLayout>
  );
}
