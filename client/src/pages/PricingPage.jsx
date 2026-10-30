import { Check, X, Crown, Users, Zap, School } from "lucide-react";
import { useUserContext } from "../context/userContext"; 
import MarketingLayout from "./marketing/MarketingLayout";

// ✅ UPDATED TIERS: Clear, punchy, and mapped to your backend limits
const tiers = [
  {
    category: "Individual Teachers",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out Noted AI in your classroom.",
    icon: Zap,
    color: "text-gray-500",
    features: [
      "5 AI-generated quizzes per week",
      "Up to 25 student codes per quiz",
      "Up to 40 AI questions per quiz",
      "Unlimited manual questions",
      'Basic quiz analytics',
    ],
    notIncluded: ["Game Show Mode", "CSV Grade Export", "Removes Watermark"],
    cta: "Current Plan",
    disabled: true,
  },
  {
    category: "Individual Teachers",
    name: "Teacher Pro",
    price: "$9",
    period: "/month",
    description: "For dedicated teachers who want premium, time-saving tools.",
    icon: Crown,
    color: "text-brand",
    popular: true,
    features: [
      "Unlimited AI-generated quizzes",
      "Up to 50 student codes per quiz",
      "Up to 60 AI questions per quiz",
      "12 Game Show sessions per month",
      "Advanced CSV Grade Export",
      "NO Watermark on quizzes",
      "Toggle answer review after submission",
    ],
    notIncluded: ["Manage other teachers"],
    cta: "Upgrade to Pro",
    disabled: false,
  },
  {
    category: "School Owners",
    name: "School Owner",
    price: "$25",
    period: "/month",
    description: "The ultimate command center for your entire school.",
    icon: School,
    color: "text-purple-600",
    popular: false,
    features: [
      "Includes up to 5 Teacher accounts",
      "School-Wide Dashboard: View all teacher results",
      "Teachers under you get elevated limits (50 Qs, 30 students)",
      "Unlimited Game Shows for the School Owner",
      "NO Watermark on any school quiz",
      "Advanced CSV Export for the whole school",
      "Only $5/month per extra teacher (beyond 5)",
      "Priority Support & Early Feature Access",
    ],
    notIncluded: [],
    cta: "Upgrade to School Plan",
    disabled: false,
  },
];

export default function PricingPage() {
  const { user } = useUserContext(); 

  const handleUpgrade = (tierName) => {
    // 🚀 TODO: Integrate Paystack / Flutterwave Popup here
    // Example: openPaystackCheckout({ email: user.email, amount: tierName === "School Owner" ? 2500 : 900 })
    
    if (tierName === "School Owner") {
      alert("Redirecting to secure School Plan checkout... (Paystack integration next)");
      // navigate("/checkout?plan=school_owner");
    } else if (tierName === "Teacher Pro") {
      alert("Redirecting to secure Teacher Pro checkout... (Paystack integration next)");
      // navigate("/checkout?plan=teacher_pro");
    }
  };

  // Group tiers by category for the two-section layout
  const teacherTiers = tiers.filter(t => t.category === "Individual Teachers");
  const schoolTiers = tiers.filter(t => t.category === "School Owners");

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          
          {/* Header */}
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Plans for every classroom</p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              Choose the plan that fits your individual classroom or your entire school. 
              Upgrade, downgrade, or cancel at any time.
            </p>
          </div>

          {/* SECTION 1: Individual Teachers */}
          <div className="mt-16">
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-xl font-bold text-foreground">For Individual Teachers</h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
              {teacherTiers.map((tier) => (
                <PricingCard key={tier.name} tier={tier} user={user} onUpgrade={handleUpgrade} />
              ))}
            </div>
          </div>

          {/* SECTION 2: School Owners */}
          <div className="mt-20">
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-xl font-bold text-foreground">For School Owners & Administrators</h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            <div className="mx-auto max-w-md lg:max-w-lg">
              {schoolTiers.map((tier) => (
                <PricingCard key={tier.name} tier={tier} user={user} onUpgrade={handleUpgrade} isSchool />
              ))}
            </div>
          </div>

        </div>
      </div>
    </MarketingLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable Pricing Card Component                                      */
/* ------------------------------------------------------------------ */
function PricingCard({ tier, user, onUpgrade, isSchool = false }) {
  const isCurrentPlan = user?.subscriptionTier === tier.name.toLowerCase().replace(" ", "_");

  return (
    <div
      className={`relative flex min-w-0 flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-lg sm:p-8 ${
        tier.popular ? "border-brand ring-1 ring-brand/20" : "border-border"
      } ${isSchool ? "bg-gradient-to-b from-purple-500/5 to-card" : ""}`}
    >
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-brand-foreground shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <div className={`flex items-center gap-2.5 ${tier.color}`}>
          <tier.icon className="h-6 w-6" />
          <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{tier.description}</p>
      </div>

      <div className="mb-8 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-tight text-foreground">{tier.price}</span>
        <span className="text-base font-medium text-muted-foreground">{tier.period}</span>
      </div>

      <ul className="mb-8 flex-1 space-y-4 text-left">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            <span className="leading-6">{feature}</span>
          </li>
        ))}
        {tier.notIncluded.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground opacity-60">
            <X className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <span className="leading-6">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onUpgrade(tier.name)}
        disabled={tier.disabled || isCurrentPlan}
        className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
          tier.disabled || isCurrentPlan
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : tier.popular
            ? "bg-brand text-brand-foreground hover:bg-brand/90"
            : isSchool 
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-foreground text-background hover:bg-foreground/90"
        }`}
      >
        {isCurrentPlan ? "Current Plan" : tier.cta}
      </button>
    </div>
  );
}
