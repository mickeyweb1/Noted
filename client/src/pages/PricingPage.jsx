import { useState } from "react";
import {
  Check,
  X,
  Crown,
  Users,
  Zap,
  Star,
  Building2,
  Sparkles,
  Shield,
  WifiOff,
  BadgeCheck,
  ChevronDown,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useUserContext } from "../context/userContext";
import MarketingLayout from "./marketing/MarketingLayout";

/*
 * Pricing assumptions for the Nigerian launch:
 * - Prices are displayed in NGN.
 * - A term is treated as 3 months.
 * - AI question credits are a monthly allowance, including for termly subscribers.
 * - One generated question consumes one AI question credit.
 *
 * IMPORTANT:
 * The frontend only displays these limits. Your API must enforce them server-side.
 * Do not rely on this array to protect your Groq usage or revenue.
 *
 * checkoutPlan values are deliberately kept only where the supplied code already
 * had working IDs. Add the other plan IDs to the checkout backend before enabling
 * direct checkout for those plans.
 */
const teacherTiers = [
  {
    name: "Free",
    monthlyPrice: "₦0",
    termlyPrice: "₦0",
    period: "forever",
    icon: Zap,
    tierKey: "free",
    checkoutPlan: null,
    description: "Try Noted AI with a real class before upgrading.",
    features: [
      "120 AI question credits per month",
      "Up to 30 AI questions per quiz",
      "Up to 15 student codes per test",
      "Unlimited manual questions",
      "Basic tab-switch activity logs",
      "Basic CSV export",
      "Noted AI branding on quizzes",
    ],
    notIncluded: [
      "Game Show mode",
      "Secure result sharing",
      "Offline quiz support",
      "Remove Noted AI branding",
    ],
  },
  {
    name: "Teacher Pro",
    monthlyPrice: "₦2,000",
    termlyPrice: "₦5,000",
    oldPrice: "₦3,200",
    period: "/ month",
    icon: Crown,
    tierKey: "pro",
    checkoutPlan: "teacher_pro",
    popular: true,
    badge: "Most popular",
    discountBadge: "Save 37%",
    description: "For teachers who regularly create and run quizzes.",
    features: [
      "All Free features, plus higher limits:",
      "400 AI question credits per month",
      "Up to 60 AI questions per quiz",
      "Up to 40 student codes per test",
      "12 Game Shows per month",
      "Advanced CSV grade export",
      "Remove Noted AI branding",
      "Secure result sharing with colleagues",
      "Offline quiz support (auto-syncs)",
      "Advanced tab-switch activity logs",
      "Priority email support",
    ],
    notIncluded: [],
  },
  {
    name: "Teacher Premium",
    monthlyPrice: "₦4,000",
    termlyPrice: "₦10,000",
    oldPrice: "₦6,000",
    period: "/ month",
    icon: Star,
    tierKey: "premium",
    checkoutPlan: null,
    discountBadge: "Save 33%",
    description: "For teachers who need higher limits and more control.",
    features: [
      "All Teacher Pro features, plus higher limits:",
      "800 AI question credits per month",
      "Up to 100 AI questions per quiz",
      "Up to 100 student codes per test",
      "Up to 30 Game Shows per month",
      "Question quality insights",
      "Duplicate quiz feature",
      "Early access to new features",
      "Priority support",
    ],
    notIncluded: [],
  },
];

const schoolTiers = [
  {
    name: "School Starter",
    monthlyPrice: "₦8,000",
    termlyPrice: "₦20,000",
    period: "/ month",
    icon: Building2,
    tierKey: "school_owner",
    checkoutPlan: "school_owner",
    description: "For small schools that want to manage quizzes centrally.",
    features: [
      "Up to 4 teacher accounts",
      "School owner dashboard",
      "School performance reports",
      "Each teacher: 200 AI question credits per month",
      "Up to 50 AI questions per quiz",
      "Up to 30 student codes per test",
      "8 Game Shows per teacher per month",
      "School-wide CSV export",
      "No Noted AI branding on quizzes",
      "Secure result sharing across the school",
      "Offline quiz support for students",
      "Extra teacher: ₦1,500/month or ₦4,000/term",
    ],
    notIncluded: [],
  },
  {
    name: "School Pro",
    monthlyPrice: "₦20,000",
    termlyPrice: "₦50,000",
    period: "/ month",
    icon: Crown,
    tierKey: "school_pro",
    checkoutPlan: null,
    popular: true,
    badge: "Best value",
    discountBadge: "Up to 13 teachers",
    description: "For growing schools with several departments or year groups.",
    features: [
      "All School Starter features, plus higher limits:",
      "Up to 13 teacher accounts",
      "Each teacher: 400 AI question credits per month",
      "Up to 80 AI questions per quiz",
      "Up to 50 student codes per test",
      "15 Game Shows per teacher per month",
      "Advanced owner analytics and reporting",
      "Export all school data",
      "School-wide question quality insights",
      "Priority support",
      "Extra teacher: ₦1,000/month or ₦2,500/term",
    ],
    notIncluded: [],
  },
  {
    name: "School Premium",
    monthlyPrice: "₦40,000",
    termlyPrice: "₦100,000",
    period: "/ month",
    icon: Star,
    tierKey: "school_premium",
    checkoutPlan: null,
    description: "For larger schools that need higher limits and closer support.",
    features: [
      "All School Pro features, plus higher limits:",
      "Up to 30 teacher accounts",
      "Each teacher: 600 AI question credits per month",
      "Up to 150 AI questions per quiz",
      "Up to 100 student codes per test",
      "30 Game Shows per teacher per month",
      "Advanced analytics and reporting",
      "Dedicated account manager",
      "Priority support",
      "Extra teacher: ₦1,000/month or ₦2,500/term",
    ],
    notIncluded: [],
  },
];

const compareRows = [
  ["AI question credits per month", "120", "600", "1,500"],
  ["Maximum AI questions per quiz", "30", "60", "100"],
  ["Student codes per test", "15", "40", "100"],
  ["Game Shows per month", "—", "12", "30"],
  ["Secure result sharing", false, true, true],
  ["Offline quiz support", false, true, true],
  ["Question quality insights", false, false, true],
  ["Quiz branding", "Noted AI", "Removed", "Removed"],
  ["CSV export", "Basic", "Advanced", "Advanced"],
  ["Support", "Standard", "Priority email", "Priority"],
];

const faqs = [
  [
    "Do my students need an account?",
    "No. Students join a quiz with the access code you give them, so they do not need to create an account.",
  ],
  [
    "How do AI question credits work?",
    "Each AI-generated question uses one credit. Credits refresh monthly. Unused credits do not roll over to the next month.",
  ],
  [
    "How long do student access codes last?",
    "Each code is valid for 30 days after it is created and can be used by one student. You can create more codes within your plan limit.",
  ],
  [
    "How do school plans work?",
    "The school owner manages teacher accounts from the school dashboard. Each teacher has an individual allowance, while the owner can view school-level activity and reports.",
  ],
  [
    "What does termly billing mean?",
    "Termly billing is one payment for a school term. The prices shown are for a three-month term. AI question credits still refresh monthly.",
  ],
  [
    "Can I try Noted AI before paying?",
    "Yes. The Free plan has no time limit, so you can use it before deciding whether to upgrade.",
  ],
];

function FeatureItem({ text, ok = true }) {
  const isHeader =
    text.toLowerCase().includes("plus") && text.endsWith(":");

  return (
    <li
      className={`flex items-start gap-3 text-sm ${
        ok ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          ok
            ? "bg-green-500/15 text-green-600 dark:text-green-400"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {ok ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : (
          <X className="h-3 w-3" strokeWidth={3} />
        )}
      </span>
      <span
        className={
          isHeader
            ? "font-semibold text-brand"
            : ok
              ? ""
              : "line-through decoration-muted-foreground/40"
        }
      >
        {text}
      </span>
    </li>
  );
}

function PlanCard({ tier, isCurrent, loggedIn, billingCycle, onChoose }) {
  const Icon = tier.icon;
  const isFree = tier.tierKey === "free";
  const price = billingCycle === "termly" ? tier.termlyPrice : tier.monthlyPrice;
  const period = isFree ? "forever" : billingCycle === "termly" ? "/ term" : "/ month";

  let buttonLabel;
  if (isCurrent) buttonLabel = "Your current plan";
  else if (isFree) buttonLabel = loggedIn ? "Included" : "Start free";
  else if (tier.checkoutPlan) buttonLabel = `Choose ${tier.name}`;
  else buttonLabel = "Contact us";

  const cardBody = (
    <div className="flex h-full min-w-0 flex-col rounded-[1.4rem] bg-card p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            tier.popular
              ? "bg-brand text-brand-foreground shadow-md shadow-brand/30"
              : "bg-brand-soft text-brand"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          {tier.name}
        </h3>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {tier.description}
      </p>

      <div className="mt-6 flex items-end gap-2">
        <span className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {price}
        </span>
        <span className="pb-1.5 text-sm text-muted-foreground">{period}</span>
      </div>

      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-2 text-sm">
        {billingCycle === "monthly" && tier.oldPrice && (
          <span className="text-muted-foreground line-through">
            {tier.oldPrice}
          </span>
        )}
        {billingCycle === "monthly" && tier.discountBadge && (
          <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
            {tier.discountBadge}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChoose(tier)}
        disabled={isCurrent || (isFree && loggedIn)}
        className={`group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed ${
          isCurrent || (isFree && loggedIn)
            ? "bg-muted text-muted-foreground"
            : tier.popular
              ? "bg-brand text-brand-foreground shadow-lg shadow-brand/25 hover:bg-brand/90 active:scale-[0.99]"
              : "border border-border bg-background text-foreground hover:bg-accent active:scale-[0.99]"
        }`}
      >
        {isCurrent && <BadgeCheck className="h-4 w-4" />}
        {buttonLabel}
        {!isCurrent && !(isFree && loggedIn) && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        )}
      </button>

      <ul className="mt-7 flex-1 space-y-3.5 border-t border-border pt-7">
        {tier.features.map((feature) => (
          <FeatureItem key={feature} text={feature} />
        ))}
        {tier.notIncluded.map((feature) => (
          <FeatureItem key={feature} text={feature} ok={false} />
        ))}
      </ul>
    </div>
  );

  if (tier.popular) {
    return (
      <div className="relative order-first rounded-[1.6rem] bg-gradient-to-b from-brand via-brand/40 to-brand/10 p-px shadow-2xl shadow-brand/15 md:order-none lg:-my-3">
        <span className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-foreground shadow-md">
          <Sparkles className="h-3.5 w-3.5" /> {tier.badge}
        </span>
        {cardBody}
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-border shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0">
      {cardBody}
    </div>
  );
}

function CompareTable() {
  const renderCell = (value) => {
    if (value === true) {
      return (
        <Check
          className="mx-auto h-5 w-5 text-green-600 dark:text-green-400"
          aria-label="Included"
        />
      );
    }
    if (value === false) {
      return (
        <X
          className="mx-auto h-5 w-5 text-muted-foreground/60"
          aria-label="Not included"
        />
      );
    }
    return <span className="font-medium text-foreground">{value}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th
              scope="col"
              className="sticky left-0 bg-muted/40 px-4 py-4 text-left font-semibold text-muted-foreground sm:px-6"
            >
              Feature
            </th>
            {["Free", "Teacher Pro", "Teacher Premium"].map((heading, index) => (
              <th
                key={heading}
                scope="col"
                className={`px-4 py-4 text-center font-bold ${
                  index === 1 ? "text-brand" : "text-foreground"
                }`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {compareRows.map(([label, ...values]) => (
            <tr key={label}>
              <th
                scope="row"
                className="sticky left-0 bg-card px-4 py-3.5 text-left font-medium text-foreground sm:px-6"
              >
                {label}
              </th>
              {values.map((value, index) => (
                <td
                  key={`${label}-${index}`}
                  className={`px-4 py-3.5 text-center ${
                    index === 1 ? "bg-brand/5" : ""
                  }`}
                >
                  {renderCell(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PricingPage() {
  const { user } = useUserContext();
  const navigate = useNavigate();
  const [audience, setAudience] = useState("teachers");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [showCompare, setShowCompare] = useState(false);

  const currentTier = user ? user.subscriptionTier || "free" : null;
  const tiers = audience === "teachers" ? teacherTiers : schoolTiers;

  const handleChoose = (tier) => {
    if (tier.tierKey === "free") {
      navigate("/signup");
      return;
    }

    if (tier.checkoutPlan) {
      // Your checkout page/backend must read `billing` and charge the matching price.
      navigate(
        `/checkout?plan=${encodeURIComponent(tier.checkoutPlan)}&billing=${billingCycle}`
      );
      return;
    }

    navigate("/contact", {
      state: { plan: tier.name, billingCycle },
    });
  };

  return (
    <MarketingLayout>
      <div className="relative overflow-hidden bg-background">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-gradient-to-b from-brand/10 via-brand/5 to-transparent"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
          {/* Hero */}
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              <Sparkles className="h-3.5 w-3.5" /> Nigerian launch pricing
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Simple pricing that grows with your classroom
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Start free. Upgrade for higher AI limits, Game Shows, sharing and
              school-wide tools. Prices are shown in naira.
            </p>
          </div>

          {/* Audience switch */}
          <div className="mt-10 flex justify-center">
            <div
              role="tablist"
              aria-label="Choose who the plan is for"
              className="inline-grid w-full max-w-sm grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm"
            >
              {[
                { id: "teachers", label: "Teachers", icon: Users },
                { id: "schools", label: "Schools", icon: Building2 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={audience === id}
                  aria-controls="pricing-panel"
                  onClick={() => setAudience(id)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    audience === id
                      ? "bg-brand text-brand-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Billing cycle switch */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <div
              className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm"
              aria-label="Choose billing cycle"
            >
              <button
                type="button"
                aria-pressed={billingCycle === "monthly"}
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  billingCycle === "monthly"
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                aria-pressed={billingCycle === "termly"}
                onClick={() => setBillingCycle("termly")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  billingCycle === "termly"
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Per term
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Termly prices cover one three-month term. AI credits refresh monthly.
            </p>
          </div>

          {/* Plans */}
          <div
            id="pricing-panel"
            role="tabpanel"
            className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch lg:gap-7"
          >
            {tiers.map((tier) => (
              <PlanCard
                key={tier.name}
                tier={tier}
                isCurrent={currentTier === tier.tierKey}
                loggedIn={Boolean(user)}
                billingCycle={billingCycle}
                onChoose={handleChoose}
              />
            ))}
          </div>

          {audience === "schools" && (
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
              Need more teacher accounts or a school-specific arrangement?{" "}
              <Link
                to="/contact"
                className="font-semibold text-brand underline-offset-4 hover:underline"
              >
                Talk to us
              </Link>
              .
            </p>
          )}

          {/* Teacher comparison */}
          {audience === "teachers" && (
            <div className="mt-14">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowCompare((value) => !value)}
                  aria-expanded={showCompare}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {showCompare ? "Hide" : "Compare"} all teacher features
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showCompare ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
              {showCompare && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                  <CompareTable />
                </div>
              )}
            </div>
          )}

          {/* Trust strip */}
          <div className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "Secure payments",
                text: "Payments are processed through Paystack.",
              },
              {
                icon: WifiOff,
                title: "Offline quiz support",
                text: "Available on eligible paid plans; answers sync when students reconnect.",
              },
              {
                icon: BadgeCheck,
                title: "Free to start",
                text: "Keep using the Free plan for as long as you like.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground">
              Questions, answered
            </h2>
            <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {faqs.map(([question, answer]) => (
                <details
                  key={question}
                  className="group px-5 py-4 sm:px-6 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    {question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 pr-8 text-sm leading-6 text-muted-foreground">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* Closing CTA */}
          <div className="mx-auto mt-20 max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand/80 p-8 text-center shadow-2xl shadow-brand/20 sm:p-12">
            <h2 className="font-display text-3xl font-bold tracking-tight text-brand-foreground sm:text-4xl">
              Ready to run your first quiz?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-foreground/80">
              Create a free account, generate questions with AI and share the
              codes with your students.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-background px-6 py-3.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-brand-foreground transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <MessageCircle className="h-4 w-4" /> Talk to us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
