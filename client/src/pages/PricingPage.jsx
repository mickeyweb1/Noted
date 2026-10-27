import { Check, X, Crown, Users, Zap } from "lucide-react";
import { useUserContext } from "../context/userContext"; 
import MarketingLayout from "./marketing/MarketingLayout";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out Noted AI.",
    icon: Zap,
    color: "text-gray-500",
    features: [
      "Max 40 AI questions per quiz",
      "Max 20 student codes per test",
      "Max 5 AI tests per week",
      "Unlimited manual questions",
      '"Powered by Noted AI" watermark',
    ],
    notIncluded: ["Game Show Mode", "CSV Grade Export", "No Watermark"],
    cta: "Current Plan",
    disabled: true,
  },
  {
    name: "Teacher Pro",
    price: "$8",
    period: "/month",
    description: "For individual teachers who want premium tools.",
    icon: Crown,
    color: "text-brand",
    popular: true,
    features: [
      "Max 60 AI questions per quiz",
      "Max 40 student codes per test",
      "Up to 12 Game Shows per month",
      "Unlimited manual questions",
      "Advanced CSV Grade Export",
      "NO Watermark",
    ],
    notIncluded: ["Manage other teachers"],
    cta: "Upgrade to Pro",
    disabled: false,
  },
  {
    name: "School Owner",
    price: "$20",
    period: "/month",
    description: "Covers up to 4 teachers. Best value for schools.",
    icon: Users,
    color: "text-purple-600",
    features: [
      "OWNER gets: UNLIMITED questions, codes, and game shows",
      "Advanced CSV Grade Export for the whole school",
      "Early access to test new features first",
      "School Overview Dashboard: View all teacher results",
      "Teachers under you get: Max 50 AI questions",
      "Teachers under you get: Max 30 student codes",
      "Teachers under you get: 8 Game Shows/month",
      "NO Watermark on any quiz",
      "Only $5/month per extra teacher (beyond 4)",
    ],
    notIncluded: [],
    cta: "Upgrade to School Plan",
    disabled: false,
  },
];

export default function PricingPage() {
  const { user } = useUserContext(); 

  const handleUpgrade = (tierName) => {
    // TODO: This will soon trigger the Paystack Checkout Popup directly
    if (tierName === "School Owner") {
      alert("Redirecting to secure School Plan checkout... (Paystack integration next)");
      // navigate("/checkout?plan=school_owner");
    } else {
      alert("Redirecting to secure Teacher Pro checkout... (Paystack integration next)");
      // navigate("/checkout?plan=teacher_pro");
    }
  };

  return (
    <MarketingLayout>
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Plans for every classroom</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          Choose the plan that fits your classroom or entire school.
        </p>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex min-w-0 flex-col rounded-2xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lg sm:p-7 ${
                tier.popular ? "border-brand" : "border-border"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex rounded-full bg-brand px-4 py-1 text-sm font-semibold text-brand-foreground shadow-sm">
                    Most Popular
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

              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground">{tier.price}</span>
                <span className="text-base font-medium text-muted-foreground">{tier.period}</span>
              </div>

              <ul className="mb-8 flex-1 space-y-3 text-left">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="h-5 w-5 shrink-0 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
                {tier.notIncluded.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground opacity-60">
                    <X className="h-5 w-5 shrink-0 text-red-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(tier.name)}
                disabled={tier.disabled || (user?.subscriptionTier === tier.name.toLowerCase().replace(" ", "_"))}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                  tier.disabled || (user?.subscriptionTier === tier.name.toLowerCase().replace(" ", "_"))
                    ? "cursor-not-allowed bg-muted text-muted-foreground"
                    : tier.popular
                    ? "bg-brand text-brand-foreground hover:bg-brand/90"
                    : "bg-foreground text-background hover:bg-foreground/90"
                }`}
              >
                {user?.subscriptionTier === tier.name.toLowerCase().replace(" ", "_") ? "Current Plan" : tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
    </MarketingLayout>
  );
}
