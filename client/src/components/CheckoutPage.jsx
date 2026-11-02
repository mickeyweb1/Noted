import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, ShieldCheck, ArrowLeft, CheckCircle2, AlertTriangle, Copy, Check, MessageCircle } from "lucide-react";
import { useUserContext } from "../context/userContext";

// ✅ YOUR BANK DETAILS ARE ALREADY FILLED IN HERE
const BANK_DETAILS = {
  bankName: "PalmPay",
  accountNumber: "9126994325",
  accountName: "Ogunleye Anuoluwa janet", // You can update this later if needed
  whatsappNumber: "2347062640714", // Your WhatsApp number
};

const PLAN_PRICES = {
  teacher_pro: { monthly: 2000, termly: 5000, label: "Teacher Pro" },
  teacher_premium: { monthly: 4000, termly: 10000, label: "Teacher Premium" },
  school_owner: { monthly: 8000, termly: 20000, label: "School Starter" },
  school_pro: { monthly: 20000, termly: 50000, label: "School Pro" },
  school_premium: { monthly: 40000, termly: 100000, label: "School Premium" },
};

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthLoading } = useUserContext();

  const planKey = searchParams.get("plan") || "teacher_pro";
  const billingCycle = searchParams.get("billing") === "termly" ? "termly" : "monthly";
  const planDetails = PLAN_PRICES[planKey];
  const amountInNaira = planDetails?.[billingCycle];

  const [copied, setCopied] = useState(false);
  const [transferConfirmed, setTransferConfirmed] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppClick = () => {
    setTransferConfirmed(true);
    const message = `Hello Noted AI, I just made a bank transfer for the *${planDetails?.label}* plan (${billingCycle}).\n\nMy account email is: *${user?.email}*\n\nPlease find my payment receipt attached.`;
    const whatsappUrl = `https://wa.me/${BANK_DETAILS.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (isAuthLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-brand" />
      </div>
    );
  }

  if (!planDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold text-foreground">That plan doesn't exist</h1>
          <p className="mt-1 text-sm text-muted-foreground">Please choose a plan from the pricing page.</p>
          <Link to="/pricing" className="mt-5 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand/90">
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
          <button onClick={() => navigate("/pricing")} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Pricing Plans
          </button>
          <h1 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">Complete Your Subscription</h1>
          <p className="mt-1 text-muted-foreground">Follow the steps below to activate your plan via bank transfer.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* LEFT SIDE: Instructions & Bank Details */}
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
              
              {/* Step 1 */}
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground text-sm font-bold">1</span>
                  Transfer the exact amount
                </h2>
                <p className="mt-2 text-sm text-muted-foreground ml-10">Please transfer <strong className="text-foreground">₦{amountInNaira.toLocaleString()}</strong> to the account details below:</p>
                
                <div className="mt-4 ml-10 rounded-xl border border-border bg-muted/50 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bank Name</span>
                    <span className="font-semibold text-foreground">{BANK_DETAILS.bankName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground text-lg">{BANK_DETAILS.accountNumber}</span>
                      <button onClick={copyToClipboard} className="p-1.5 rounded-md hover:bg-background transition-colors" title="Copy Account Number">
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Account Name</span>
                    <span className="font-semibold text-foreground">{BANK_DETAILS.accountName}</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground text-sm font-bold">2</span>
                  Send your receipt via WhatsApp
                </h2>
                <p className="mt-2 text-sm text-muted-foreground ml-10">
                  After making the transfer, click the button below to send your payment receipt to our support team on WhatsApp. We have automatically included your email ({user?.email}) in the message.
                </p>

                {!transferConfirmed ? (
                  <button
                    onClick={handleWhatsAppClick}
                    className="mt-4 ml-10 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-green-500/20 transition-all hover:bg-[#20bd5a] active:scale-[0.98]"
                  >
                    <MessageCircle className="h-5 w-5" /> 
                    Send Receipt on WhatsApp
                  </button>
                ) : (
                  <div className="mt-4 ml-10 max-w-sm rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
                      <div>
                        <h3 className="font-semibold text-green-700 dark:text-green-400">Receipt Submitted!</h3>
                        <p className="mt-1 text-sm text-green-700/80 dark:text-green-400/80">
                          Thank you! Your account (<strong>{user?.email}</strong>) will be upgraded to <strong>{planDetails.label}</strong> within the next <strong>24 hours</strong> once we verify the transfer.
                        </p>
                        <button onClick={() => navigate("/admin/dashboard")} className="mt-3 text-sm font-semibold text-brand hover:underline">
                          Return to Dashboard →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="ml-10 flex items-center gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Secure Manual Processing</span>
                <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Your data is safe with us</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Order Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{planDetails.label}</p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">{billingCycle} billing{billingCycle === "termly" ? " (3 months)" : ""}</p>
                  </div>
                  <p className="font-bold text-foreground">₦{amountInNaira.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-sm">
                <span className="text-base font-semibold text-foreground">Total Due Today</span>
                <span className="text-xl font-bold text-brand">₦{amountInNaira.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Access Includes:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-foreground"><CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> Higher AI question limits</li>
                  <li className="flex items-center gap-2 text-sm text-foreground"><CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> Remove "Noted AI" branding</li>
                  <li className="flex items-center gap-2 text-sm text-foreground"><CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> Secure result sharing & Offline support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
