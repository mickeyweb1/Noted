import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Lock,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  MessageCircle,
  Wallet,
  Clock3,
  UserRound,
} from "lucide-react";
import { useUserContext } from "../context/userContext";

// Keep these details accurate and make sure the account holder has authorised
// Noted AI to use this account for receiving subscription payments.
const BANK_DETAILS = {
  bankName: "PalmPay",
  accountNumber: "9126994325",
  accountName: "Ogunleye Anuoluwa janet",
  whatsappNumber: "2347062640714",
};

// Display-only prices. The backend remains the authority for subscription access.
const PLAN_PRICES = {
  teacher_pro:      { monthly: 2000,  termly: 5500,  label: "Teacher Pro" },
  teacher_premium:  { monthly: 5000,  termly: 13000, label: "Teacher Premium" },
  school_owner:     { monthly: 10000, termly: 25000, label: "School Starter" },
  school_pro:       { monthly: 25000, termly: 65000, label: "School Pro" },
  school_premium:   { monthly: 50000, termly: 130000, label: "School Premium" },
};

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-NG")}`;

function getDashboardPath(role) {
  return ["teacher", "school_admin", "super_admin"].includes(role)
    ? "/admin/dashboard"
    : "/dashboard";
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthLoading } = useUserContext();

  // Do not silently select a paid plan when the checkout URL has no plan.
  const planKey = searchParams.get("plan") || "";
  const billingCycle = searchParams.get("billing") === "termly" ? "termly" : "monthly";
  const planDetails = PLAN_PRICES[planKey];
  const amountInNaira = planDetails?.[billingCycle];

  const [copied, setCopied] = useState(false);
  const [transferMade, setTransferMade] = useState(false);
  const [whatsappOpened, setWhatsappOpened] = useState(false);
  const [copyError, setCopyError] = useState("");

  const isSchoolPlan = planKey.startsWith("school_");
  const isSchoolMember = Boolean(user?.schoolOwnerId) || Boolean(
    user?.schoolId && ["student", "teacher"].includes(user?.role)
  );
  const coveredBySchool = isSchoolMember;
  const wrongSchoolRole = isSchoolPlan && user?.role !== "school_admin";
  const checkoutReturnPath = `/checkout?plan=${encodeURIComponent(planKey)}&billing=${billingCycle}`;

  const copyToClipboard = async () => {
    setCopyError("");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
      } else {
        const input = document.createElement("textarea");
        input.value = BANK_DETAILS.accountNumber;
        input.setAttribute("readonly", "");
        input.style.position = "absolute";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        const copiedSuccessfully = document.execCommand("copy");
        document.body.removeChild(input);
        if (!copiedSuccessfully) throw new Error("Clipboard copy was not available.");
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Could not copy the account number:", error);
      setCopyError("Copy wasn't available. Please select and copy the account number manually.");
    }
  };

  const whatsappMessage = user?.email && planDetails
    ? [
        "Hello Noted AI, I have made a bank transfer and would like my payment verified.",
        "",
        `Plan: ${planDetails.label}`,
        `Billing: ${billingCycle === "termly" ? "Per term (3 months)" : "Monthly"}`,
        `Amount: ${formatNaira(amountInNaira)}`,
        `Account email: ${user.email}`,
        "",
        "I will attach my transfer receipt in this chat.",
      ].join("\n")
    : "";
  const whatsappUrl = whatsappMessage
    ? `https://wa.me/${BANK_DETAILS.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : "#";

  if (isAuthLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-brand" />
      </div>
    );
  }

  if (!planDetails || !amountInNaira) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold text-foreground">Choose a valid subscription plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">The checkout link is missing a valid plan. Return to pricing and select a plan again.</p>
          <Link to="/pricing" className="mt-5 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand/90">
            Back to pricing
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <UserRound className="mx-auto mb-3 h-10 w-10 text-brand" />
          <h1 className="text-xl font-bold text-foreground">Sign in to continue</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to Noted AI before viewing payment instructions. Your subscription will be associated with your account email.</p>
          <Link to="/login" state={{ from: checkoutReturnPath }} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand/90">
            Sign in
          </Link>
          <Link to="/pricing" className="mt-4 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">
            Back to pricing
          </Link>
        </div>
      </div>
    );
  }

  if (coveredBySchool || wrongSchoolRole) {
    const title = coveredBySchool ? "Your plan is managed by your school" : "School administrator account required";
    const message = coveredBySchool
      ? "Your school provides your Noted AI access. Contact your school administrator if you need a plan upgrade."
      : "School subscriptions can only be purchased by an account with the school administrator role. Sign in with the authorised school administrator account to continue.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
          <Link to={getDashboardPath(user.role)} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand/90">
            Go to dashboard
          </Link>
          <Link to="/pricing" className="mt-4 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">
            Back to pricing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Pricing Plans
          </button>
          <h1 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">Complete Your Subscription</h1>
          <p className="mt-1 text-muted-foreground">Follow the steps below to pay by bank transfer.</p>
        </div>

        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-foreground">Manual payment verification</p>
            <p className="mt-1 leading-6 text-muted-foreground">
              This is a temporary bank-transfer process. Your plan is not activated when you open WhatsApp or send a receipt. Access is enabled only after the receiving account confirms that the funds have arrived.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <div className="space-y-7 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
              <section aria-labelledby="transfer-heading">
                <h2 id="transfer-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">1</span>
                  Transfer the exact amount
                </h2>
                <p className="ml-10 mt-2 text-sm leading-6 text-muted-foreground">
                  Transfer <strong className="text-foreground">{formatNaira(amountInNaira)}</strong> to the account below. Check the account name and amount carefully before confirming the transfer.
                </p>

                <div className="ml-10 mt-4 space-y-3 rounded-xl border border-border bg-muted/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Bank / wallet</span>
                    <span className="font-semibold text-foreground">{BANK_DETAILS.bankName}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Account number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold tracking-wide text-foreground">{BANK_DETAILS.accountNumber}</span>
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="rounded-md p-2 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        title="Copy account number"
                        aria-label="Copy account number"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Account name</span>
                    <span className="text-right font-semibold text-foreground">{BANK_DETAILS.accountName}</span>
                  </div>
                  <p aria-live="polite" className={`text-xs ${copyError ? "text-destructive" : "text-green-700 dark:text-green-400"}`}>
                    {copied ? "Account number copied." : copyError}
                  </p>
                </div>
              </section>

              <section aria-labelledby="receipt-heading" className="border-t border-border pt-6">
                <h2 id="receipt-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">2</span>
                  Send your receipt via WhatsApp
                </h2>
                <p className="ml-10 mt-2 text-sm leading-6 text-muted-foreground">
                  After completing the transfer, confirm below and open WhatsApp. The message will include your plan, amount and account email. Attach your transfer receipt in WhatsApp and press Send.
                </p>

                <label className="ml-10 mt-4 flex cursor-pointer items-start gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={transferMade}
                    onChange={(event) => {
                      setTransferMade(event.target.checked);
                      setWhatsappOpened(false);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
                  />
                  <span>I have completed the bank transfer for the exact amount shown above.</span>
                </label>

                <a
                  href={transferMade ? whatsappUrl : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    if (!transferMade) {
                      event.preventDefault();
                      return;
                    }
                    setWhatsappOpened(true);
                  }}
                  aria-disabled={!transferMade}
                  className={`ml-10 mt-4 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 ${
                    transferMade
                      ? "bg-[#25D366] shadow-lg shadow-green-500/20 hover:bg-[#20bd5a] active:scale-[0.98]"
                      : "cursor-not-allowed bg-muted text-muted-foreground"
                  }`}
                >
                  <MessageCircle className="h-5 w-5" /> Open WhatsApp to send receipt
                </a>

                {whatsappOpened && (
                  <div className="ml-10 mt-4 max-w-sm rounded-xl border border-brand/30 bg-brand/5 p-4" role="status">
                    <p className="font-semibold text-foreground">WhatsApp opened</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Attach the transfer receipt and press Send in WhatsApp. This page cannot tell whether your message was sent or whether the transfer has been verified.
                    </p>
                  </div>
                )}

                <p className="ml-10 mt-4 text-xs leading-5 text-muted-foreground">
                  Never share your card PIN, password or one-time password (OTP). A receipt message is only a request for review; it does not activate your subscription.
                </p>
              </section>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Bank transfer</span>
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Manual payment review</span>
                <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Account-specific checkout</span>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-2" aria-label="Order summary">
            <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{planDetails.label}</p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {billingCycle === "termly" ? "Per term (3 months)" : "Monthly billing"}
                    </p>
                  </div>
                  <p className="whitespace-nowrap font-bold text-foreground">{formatNaira(amountInNaira)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <span className="text-base font-semibold text-foreground">Total to transfer</span>
                <span className="text-xl font-bold text-brand">{formatNaira(amountInNaira)}</span>
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your plan includes</p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> Higher AI question limits</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> Remove Noted AI branding on eligible plans</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> Secure result sharing and offline support on eligible plans</li>
                </ul>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Features and limits depend on the plan selected. Review the plan details on the pricing page before transferring.
                </p>
              </div>
              <Link to={getDashboardPath(user.role)} className="inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">
                Return to dashboard
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
