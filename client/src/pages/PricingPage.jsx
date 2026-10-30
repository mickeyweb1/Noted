import { Check, X, Crown, Users, Zap, Star, Building2, Sparkles, Shield, Clock, Share2, WifiOff, AlertTriangle } from "lucide-react";
import { useUserContext } from "../context/userContext"; 
import { useNavigate } from "react-router-dom";
import MarketingLayout from "./marketing/MarketingLayout";

const teacherTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out Noted AI and small classes.",
    icon: Zap,
    color: "text-gray-500",
    features: [
      "Max 40 AI-generated questions per quiz",
      "Max 25 student access codes per test",
      "Max 5 AI tests per week",
      "Unlimited manual question creation",
      "Basic tab-switch detection",
      "Basic CSV grade export",
    ],
    notIncluded: [
      "Powered by Noted AI watermark",
      "Game Show mode",
      "Share results with other teachers",
      "Offline quiz submission support",
    ],
    cta: "Current Plan",
    disabled: true,
    planId: "free",
  },
  {
    name: "Teacher Pro",
    price: "$5",
    period: "/month",
    description: "Everything you need to run a modern, engaging classroom.",
    icon: Crown,
    color: "text-brand",
    popular: true,
    badge: "Special Launch Offer",
    features: [
      "Max 60 AI-generated questions per quiz",
      "Max 50 student access codes per test",
      "Up to 12 Interactive Game Shows per month",
      "Unlimited manual question creation",
      "Advanced CSV grade export",
      "NO Watermark on any quiz",
      "Share quiz results securely with colleagues",
      "Offline quiz submission support for students",
      "Priority email support",
    ],
    notIncluded: [],
    cta: "Upgrade to Pro",
    disabled: false,
    planId: "teacher_pro",
  },
  {
    name: "Teacher Premium",
    price: "$10",
    period: "/month",
    description: "For power users who demand unlimited access and insights.",
    icon: Star,
    color: "text-purple-600",
    features: [
      "UNLIMITED AI-generated questions per quiz",
      "Max 100 student access codes per test",
      "UNLIMITED Interactive Game Shows",
      "Unlimited manual question creation",
      "Advanced Question Quality Insights & Analytics",
      "NO Watermark on any quiz",
      "Share quiz results securely with colleagues",
      "Offline quiz submission support for students",
      "Early access to new features (e.g., AI Proctoring)",
      "24-hour priority support",
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
    description: "Covers up to 4 teachers. Best for small schools or departments.",
    icon: Building2,
    color: "text-blue-600",
    features: [
      "Covers up to 4 teachers",
      "OWNER: UNLIMITED questions, codes, and game shows",
      "TEACHERS: Max 50 AI questions, 40 codes, 8 Game Shows/mo",
      "School Overview Dashboard (View all teacher results)",
      "Secure Result Sharing between teachers",
      "Advanced CSV Grade Export for the whole school",
      "NO Watermark on any quiz",
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
    description: "Covers up to 13 teachers. Perfect for growing institutions.",
    icon: Crown,
    color: "text-brand",
    popular: true,
    badge: "Best Value",
    features: [
      "Covers up to 13 teachers",
      "OWNER: UNLIMITED + Advanced Analytics & Reporting",
      "TEACHERS: Max 80 AI questions, 60 codes, 15 Game Shows/mo",
      "Centralized Result Sharing & Management",
      "Class Mastery Maps & Question Quality Insights",
      "Export all school data securely",
      "NO Watermark on any quiz",
      "Offline quiz support for all students",
      "Priority support",
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
    description: "Covers up to 30 teachers. For large schools and districts.",
    icon: Star,
    color: "text-purple-600",
    features: [
      "Covers up to 30 teachers",
      "OWNER: UNLIMITED + API Access + Dedicated Manager",
      "TEACHERS: Max 150 AI questions, 100 codes, 30 Game Shows/mo",
      "Custom branding (White-label option)",
      "Advanced Analytics, Reporting & Class Mastery Maps",
      "Centralized Result Sharing & Management",
      "NO Watermark on any quiz",
      "Offline quiz support for all students",
      "24/7 Priority Support",
      "$3/month per extra teacher (beyond 30)",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    disabled: false,
    planId: "school_premium",
  },
];

const faqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle."
  },
  {
    q: "What happens if a student loses internet during a quiz?",
    a: "Noted AI features built-in Offline Quiz Support (on Pro and Premium plans). Students can continue answering, and their progress will automatically sync and submit once they reconnect."
  },
  {
    q: "How does the 'Share Results' feature work?",
    a: "Teachers on Pro plans and above can generate a secure, temporary share code for any quiz. Other teachers can enter this code to view the results, add new access codes, and monitor submissions without being able to edit or delete the original quiz."
  },
  {
    q: "Are there hidden fees for extra students?",
    a: "No hidden fees. You only pay for extra teachers on School plans if you exceed the included limit. Student access codes are included up to your plan's limit per quiz."
  },
  {
    q: "Do you offer discounts for annual billing?",
    a: "Yes! Contact our sales team for custom annual pricing, which includes up to 20% off the monthly rates listed above."
  }
];

export default function PricingPage() {
  const { user } = useUserContext();
  const navigate = useNavigate();

  const handleUpgrade = (planId) => {
    if (user?.subscriptionTier === planId) {
      return; 
    }
    // TODO: Integrate Paystack/Stripe here
    alert(`Redirecting to secure checkout for: ${planId.replace("_", " ").toUpperCase()}... (Payment integration coming soon)`);
  };

  const isCurrentPlan = (planId) => user?.subscriptionTier === planId;

  const renderSection = (title, subtitle, tiers) => (
    <div className="mb-20">
      <div className="mx-auto max-w-2xl text-center mb-12">
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          {subtitle}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex min-w-0 flex-col rounded-3xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-xl sm:p-8 ${
              tier.popular ? "border-brand ring-2 ring-brand/20 scale-105 z-10" : "border-border hover:border-brand/50"
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-brand-foreground shadow-md">
                  <Sparkles className="h-4 w-4" />
                  {tier.badge || "Most Popular"}
                </span>
              </div>
            )}

            <div className="mb-6">
              <div className={`flex items-center gap-3 ${tier.color}`}>
                <div className="rounded-xl bg-muted p-2">
                  <tier.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{tier.description}</p>
            </div>

            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold tracking-tight text-foreground">{tier.price}</span>
              <span className="text-base font-medium text-muted-foreground">{tier.period}</span>
            </div>

            <ul className="mb-8 flex-1 space-y-4 text-left">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                  <span className="leading-6">{feature}</span>
                </li>
              ))}
              {tier.notIncluded.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                  <span className="leading-6 opacity-70">{feature}</span>
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
                  ? "bg-brand text-brand-foreground hover:bg-brand/90 hover:shadow-lg hover:shadow-brand/20"
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
      <div className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          
          {/* Page Header */}
          <div className="mx-auto max-w-3xl text-center mb-20">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-sm font-semibold text-brand mb-6">
              <Sparkles className="h-4 w-4" />
              Special Launch Pricing Active
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Choose the plan that fits your classroom or entire school. 
              Upgrade, downgrade, or cancel at any time. No hidden fees.
            </p>
          </div>

          {/* Section 1: Teacher Plans */}
          {renderSection(
            "For Individual Teachers",
            "Powerful tools to create, manage, and grade quizzes effortlessly, even offline.",
            teacherTiers
          )}

          {/* Divider */}
          <div className="relative mb-20">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Or scale up for your entire school
              </span>
            </div>
          </div>

          {/* Section 2: School Plans */}
          {renderSection(
            "For Schools & Administrators",
            "Centralized management, advanced analytics, and seamless collaboration for your institution.",
            schoolTiers
          )}

          {/* FAQ Section to make it look professional and long */}
          <div className="mx-auto max-w-3xl mt-24">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Everything you need to know about the product and billing.
              </p>
            </div>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="flex items-start gap-3 text-lg font-semibold text-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                      {index + 1}
                    </span>
                    {faq.q}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-muted-foreground pl-9">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="mx-auto mt-24 max-w-4xl rounded-3xl bg-brand p-8 text-center text-brand-foreground shadow-xl sm:p-12 lg:p-16">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to transform your classroom?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-foreground/80">
              Join thousands of teachers and schools already using Noted AI to save time and improve student outcomes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button 
                onClick={() => navigate("/signup")}
                className="rounded-xl bg-background px-8 py-3.5 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-background/90 hover:shadow-lg"
              >
                Get Started for Free
              </button>
              <button 
                onClick={() => navigate("/contact")}
                className="rounded-xl border border-brand-foreground/30 px-8 py-3.5 text-sm font-bold text-brand-foreground transition-all hover:bg-brand-foreground/10"
              >
                Contact Sales
              </button>
            </div>
          </div>

        </div>
      </div>
    </MarketingLayout>
  );
}
