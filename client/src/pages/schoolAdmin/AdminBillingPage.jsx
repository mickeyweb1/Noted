import { Check, Building2, User, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
const schoolPlans = [
  {
    name: "Basic School Plan",
    price: "1,000",
    period: "per student / month",
    description: "Perfect for core learning and note summarization.",
    features: [
      "AI Note Summarization",
      "Audio Study Playback",
      "Focus Timer & Quizzes",
      "Basic Progress Tracking",
    ],
    notIncluded: ["Community Video Library", "Priority Support"],
    highlight: false,
  },
  {
    name: "Premium School Plan",
    price: "1,500",
    period: "per student / month",
    description:
      "Full access to all learning materials and community features.",
    features: [
      "Everything in Basic, plus:",
      "Full Community Video Library Access",
      "Advanced AI Teacher Chat",
      "Detailed Parent/Teacher Analytics",
      "Priority Email Support",
    ],
    notIncluded: [],
    highlight: true, // This makes it pop out
  },
];

const personalPlans = [
  {
    name: "Personal Starter",
    price: "2,000",
    period: "per month",
    description: "For independent learners who want a boost.",
    features: [
      "AI Note Summarization",
      "Audio Playback",
      "5 AI Teacher questions/day",
    ],
    notIncluded: ["Community Library", "Unlimited AI Chat"],
    highlight: false,
  },
  {
    name: "Personal Pro",
    price: "3,000",
    period: "per month",
    description: "Unlock the full power of Noted for yourself.",
    features: [
      "Everything in Starter",
      "Unlimited AI Teacher Chat",
      "Full Community Library Access",
      "Advanced Quiz Generation",
    ],
    notIncluded: [],
    highlight: true,
  },
];

export default function AdminBillingPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Flexible pricing for schools, parents, and independent learners.
          <span className="text-brand font-medium">
            {" "}
            Contact us for volume discounts
          </span>{" "}
          for schools with 20+ students.
        </p>
      </div>

      {/* ================= SCHOOL / PARENT PLANS ================= */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Building2 className="w-5 h-5 text-brand" />
          <h2 className="text-xl font-bold text-foreground">
            For Schools & Parents (Per Student)
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {schoolPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-4 sm:p-6 flex flex-col ${plan.highlight ? "border-brand bg-brand/5 shadow-lg" : "border-border bg-card"}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-brand-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-display font-bold text-foreground">
                  ₦{plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {" "}
                  / {plan.period}
                </span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />{" "}
                    {feature}
                  </li>
                ))}
                {plan.notIncluded.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-muted-foreground/60"
                  >
                    <span className="w-4 h-4 mt-0.5 shrink-0">✕</span> {feature}
                  </li>
                ))}
              </ul>
              <NavLink to="/checkout">
                <button
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${plan.highlight ? "bg-brand text-brand-foreground hover:bg-brand/90" : "bg-muted text-foreground hover:bg-muted/80"}`}
                >
                  Select Plan
                </button>
              </NavLink>
            </div>
          ))}
        </div>
      </div>

      {/* ================= PERSONAL PLANS ================= */}
      <div className="space-y-6 pt-8 border-t border-border">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <User className="w-5 h-5 text-electric" />
          <h2 className="text-xl font-bold text-foreground">
            For Personal Use
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {personalPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-4 sm:p-6 flex flex-col ${plan.highlight ? "border-electric bg-electric/5 shadow-lg" : "border-border bg-card"}`}
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-display font-bold text-foreground">
                  ₦{plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {" "}
                  / {plan.period}
                </span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />{" "}
                    {feature}
                  </li>
                ))}
              </ul>
              <NavLink to="/checkout">
                <button
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${plan.highlight ? "bg-electric text-white hover:bg-electric/90" : "bg-muted text-foreground hover:bg-muted/80"}`}
                >
                  Select Plan
                </button>
              </NavLink>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
