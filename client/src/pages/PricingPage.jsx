import { useState } from "react";
import { Check, X, Crown, Users, Zap, Star, Building2, Sparkles, Shield, WifiOff, BadgeCheck, ChevronDown, ArrowRight, MessageCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useUserContext } from "../context/userContext";
import MarketingLayout from "./marketing/MarketingLayout";

/*
  tierKey      = the value stored in user.subscriptionTier (used for "Current plan")
  checkoutPlan = the plan id /checkout and the payment API understand today.
                 Plans without one send people to Contact until the backend supports them.
*/
const teacherTiers = [
  {
    name: "Free", price: "$0", period: "forever", icon: Zap, tierKey: "free", checkoutPlan: null,
    description: "Everything you need to try Noted AI with a class.",
    features: [
      "Up to 40 AI questions per quiz", 
      "Up to 25 student codes per test", 
      "5 AI tests per week", 
      "Unlimited manual questions", 
      "Basic tab-switch tracking", 
      "Basic CSV export"
    ],
    notIncluded: ["Game Show mode", "Secure result sharing", "No \"Powered by Noted AI\" watermark"],
  },
  {
    name: "Teacher Pro", price: "$5", oldPrice: "$8", period: "/ month", icon: Crown, tierKey: "pro", checkoutPlan: "teacher_pro",
    popular: true, badge: "Most popular", discountBadge: "Save 37%",
    description: "For teachers who run quizzes every week.",
    features: [
      "Everything in Free, plus:",
      "Up to 60 AI questions per quiz", 
      "Up to 40 student codes per test", 
      "12 Game Shows per month", 
      "Unlimited AI tests", 
      "Advanced CSV grade export", 
      "No watermark on quizzes", 
      "Secure result sharing with colleagues", 
      "Offline quiz support (auto-syncs)", 
      "Advanced anti-cheating tab tracking", 
      "Priority email support"
    ],
    notIncluded: [],
  },
  {
    name: "Teacher Premium", price: "$10", oldPrice: "$15", period: "/ month", icon: Star, tierKey: "premium", checkoutPlan: null,
    discountBadge: "Save 33%",
    description: "For power users who need no limits.",
    features: [
      "Everything in Teacher Pro, plus:",
      "Unlimited AI questions per quiz", 
      "Up to 100 student codes per test", 
      "Unlimited Game Shows", 
      "Question quality insights", 
      "Duplicate quiz feature", 
      "Early access to new features", 
      "24-hour priority support"
    ],
    notIncluded: [],
  },
];

const schoolTiers = [
  {
    name: "School Starter", price: "$20", period: "/ month", icon: Building2, tierKey: "school_owner", checkoutPlan: "school_owner",
    description: "Includes up to 4 teachers. Ideal for small schools.",
    features: [
      "Owner: unlimited questions, codes and game shows", 
      "Teachers: 50 AI questions, 30 codes, 8 Game Shows / month", 
      "School overview dashboard", 
      "School-wide CSV export", 
      "No watermark on any quiz", 
      "Secure result sharing across the school", 
      "Offline quiz support for all students", 
      "$4 / month per extra teacher (beyond 4)"
    ],
    notIncluded: [],
  },
  {
    name: "School Pro", price: "$50", period: "/ month", icon: Crown, tierKey: "school_pro", checkoutPlan: null,
    popular: true, badge: "Best value", discountBadge: "Up to 13 teachers",
    description: "Growing schools with several departments.",
    features: [
      "Everything in School Starter, plus:",
      "Includes up to 13 teachers",
      "Owner: advanced analytics & reporting", 
      "Teachers: 80 AI questions, 50 codes, 15 Game Shows / month", 
      "Export all school data", 
      "School-wide question quality insights", 
      "Priority support", 
      "$3 / month per extra teacher (beyond 13)"
    ],
    notIncluded: [],
  },
  {
    name: "School Premium", price: "$100", period: "/ month", icon: Star, tierKey: "school_premium", checkoutPlan: null,
    description: "Large institutions.",
    features: [
      "Everything in School Pro, plus:",
      "Includes up to 30 teachers",
      "Owner: dedicated account manager", 
      "Teachers: 150 AI questions, 100 codes, 30 Game Shows / month", 
      "Advanced analytics & reporting", 
      "24/7 priority support", 
      "$3 / month per extra teacher (beyond 30)"
    ],
    notIncluded: [],
  },
];

const compareRows = [
  ["AI questions per quiz", "40", "60", "Unlimited"],
  ["Student codes per test", "25", "40", "100"],
  ["AI tests per week", "5", "Unlimited", "Unlimited"],
  ["Game Shows per month", "—", "12", "Unlimited"],
  ["Result sharing with colleagues", false, true, true],
  ["Offline quiz support", false, true, true],
  ["Question quality insights", false, false, true],
  ["Watermark on quizzes", "Yes", "No", "No"],
  ["CSV export", "Basic", "Advanced", "Advanced"],
  ["Support", "Community", "Priority email", "24-hour priority"],
];

const faqs = [
  ["Do my students need an account?", "No. Students join a quiz with the access code you give them, so there's nothing for them to sign up for."],
  ["How long do access codes last?", "Each code is valid for 30 days after it's created, and can be used by one student. You can add more codes from the results page at any time."],
  ["How do school plans work?", "The school owner adds teachers from the dashboard. Each teacher gets their own limits, and the owner can see every teacher's quiz results in one place."],
  ["Can I try Noted before paying?", "Yes. The Free plan has no time limit, so you can run real quizzes with your class first."],
];

function FeatureItem({ text, ok = true }) {
  // Make the "Everything in X, plus:" text stand out slightly
  const isHeader = text.toLowerCase().includes("everything in") && text.toLowerCase().includes("plus:");
  
  return (
    <li className={`flex items-start gap-3 text-sm ${ok ? "text-foreground" : "text-muted-foreground"}`}>
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
        {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className={isHeader ? "font-semibold text-brand" : (ok ? "" : "line-through decoration-muted-foreground/40")}>
        {text}
      </span>
    </li>
  );
}

function PlanCard({ tier, isCurrent, loggedIn, onChoose }) {
  const Icon = tier.icon;
  const isFree = tier.tierKey === "free";

  let label;
  if (isCurrent) label = "Your current plan";
  else if (isFree) label = loggedIn ? "Included" : "Start free";
  else if (tier.checkoutPlan) label = `Choose ${tier.name}`;
  else label = "Contact us";

  const button = (
    <button
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
      {label}
      {!isCurrent && !(isFree && loggedIn) && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />}
    </button>
  );

  const body = (
    <div className="flex h-full min-w-0 flex-col rounded-[1.4rem] bg-card p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tier.popular ? "bg-brand text-brand-foreground shadow-md shadow-brand/30" : "bg-brand-soft text-brand"}`}><Icon className="h-5 w-5" /></span>
        <h3 className="text-xl font-bold tracking-tight text-foreground">{tier.name}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{tier.description}</p>

      <div className="mt-6 flex items-end gap-2">
        <span className="font-display text-5xl font-extrabold tracking-tight text-foreground">{tier.price}</span>
        <span className="pb-1.5 text-sm text-muted-foreground">{tier.period}</span>
      </div>
      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-2 text-sm">
        {tier.oldPrice && <span className="text-muted-foreground line-through">{tier.oldPrice}</span>}
        {tier.discountBadge && <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">{tier.discountBadge}</span>}
      </div>

      {button}

      <ul className="mt-7 flex-1 space-y-3.5 border-t border-border pt-7">
        {tier.features.map((f) => <FeatureItem key={f} text={f} />)}
        {tier.notIncluded.map((f) => <FeatureItem key={f} text={f} ok={false} />)}
      </ul>
    </div>
  );

  return tier.popular ? (
    <div className="relative order-first rounded-[1.6rem] bg-gradient-to-b from-brand via-brand/40 to-brand/10 p-px shadow-2xl shadow-brand/15 md:order-none lg:-my-3">
      <span className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-foreground shadow-md">
        <Sparkles className="h-3.5 w-3.5" /> {tier.badge}
      </span>
      {body}
    </div>
  ) : (
    <div className="relative rounded-3xl border border-border shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0">{body}</div>
  );
}

function CompareTable() {
  const cell = (v) => v === true ? <Check className="mx-auto h-5 w-5 text-green-600 dark:text-green-400" aria-label="Included" /> : v === false ? <X className="mx-auto h-5 w-5 text-muted-foreground/60" aria-label="Not included" /> : <span className="font-medium text-foreground">{v}</span>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th scope="col" className="sticky left-0 bg-muted/40 px-4 py-4 text-left font-semibold text-muted-foreground sm:px-6">Feature</th>
            {["Free", "Teacher Pro", "Teacher Premium"].map((h, i) => (
              <th key={h} scope="col" className={`px-4 py-4 text-center font-bold ${i === 1 ? "text-brand" : "text-foreground"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {compareRows.map(([label, ...vals]) => (
            <tr key={label}>
              <th scope="row" className="sticky left-0 bg-card px-4 py-3.5 text-left font-medium text-foreground sm:px-6">{label}</th>
              {vals.map((v, i) => <td key={i} className={`px-4 py-3.5 text-center ${i === 1 ? "bg-brand/5" : ""}`}>{cell(v)}</td>)}
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
  const [showCompare, setShowCompare] = useState(false);

  const currentTier = user ? user.subscriptionTier || "free" : null;
  const tiers = audience === "teachers" ? teacherTiers : schoolTiers;

  const handleChoose = (tier) => {
    if (tier.tierKey === "free") return navigate("/signup");
    if (tier.checkoutPlan) return navigate(`/checkout?plan=${tier.checkoutPlan}`); // the checkout page asks logged-out users to sign in
    navigate("/contact", { state: { plan: tier.name } });
  };

  return (
    <MarketingLayout>
      <div className="relative overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-gradient-to-b from-brand/10 via-brand/5 to-transparent" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">

          {/* Hero */}
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              <Sparkles className="h-3.5 w-3.5" /> Launch pricing
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Simple pricing that grows with your classroom
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Start free. Upgrade when you need game shows, sharing and bigger quizzes. No hidden fees.
            </p>
          </div>

          {/* Audience switch */}
          <div className="mt-10 flex justify-center">
            <div role="tablist" aria-label="Choose who the plan is for" className="inline-grid w-full max-w-sm grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
              {[{ id: "teachers", label: "Teachers", icon: Users }, { id: "schools", label: "Schools", icon: Building2 }].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={audience === id}
                  aria-controls="pricing-panel"
                  onClick={() => setAudience(id)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${audience === id ? "bg-brand text-brand-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div id="pricing-panel" role="tabpanel" className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch lg:gap-7">
            {tiers.map((tier) => (
              <PlanCard key={tier.name} tier={tier} isCurrent={currentTier === tier.tierKey} loggedIn={Boolean(user)} onChoose={handleChoose} />
            ))}
          </div>

          {audience === "schools" && (
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
              Not sure which size fits? <Link to="/contact" className="font-semibold text-brand underline-offset-4 hover:underline">Talk to us</Link> and we'll help you pick.
            </p>
          )}

          {/* Compare (teachers) */}
          {audience === "teachers" && (
            <div className="mt-14">
              <div className="flex justify-center">
                <button onClick={() => setShowCompare((v) => !v)} aria-expanded={showCompare} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {showCompare ? "Hide" : "Compare"} all teacher features <ChevronDown className={`h-4 w-4 transition-transform ${showCompare ? "rotate-180" : ""}`} />
                </button>
              </div>
              {showCompare && <div className="mt-6 animate-in fade-in slide-in-from-top-2"><CompareTable /></div>}
            </div>
          )}

          {/* Trust strip */}
          <div className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { icon: Shield, title: "Secure payments", text: "Checkout is handled by Paystack." },
              { icon: WifiOff, title: "Works offline", text: "Student answers sync when they reconnect." },
              { icon: BadgeCheck, title: "Free to start", text: "Keep the Free plan for as long as you like." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
                <div><p className="font-semibold text-foreground">{title}</p><p className="mt-0.5 text-sm text-muted-foreground">{text}</p></div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground">Questions, answered</h2>
            <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {faqs.map(([q, a]) => (
                <details key={q} className="group px-5 py-4 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    {q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 pr-8 text-sm leading-6 text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Closing CTA */}
          <div className="mx-auto mt-20 max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand/80 p-8 text-center shadow-2xl shadow-brand/20 sm:p-12">
            <h2 className="font-display text-3xl font-bold tracking-tight text-brand-foreground sm:text-4xl">Ready to run your first quiz?</h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-foreground/80">Create a free account, generate questions with AI and share the codes in minutes.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-background px-6 py-3.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand">
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-brand-foreground transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <MessageCircle className="h-4 w-4" /> Talk to us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
