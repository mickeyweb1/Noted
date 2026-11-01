import { useState, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, ShieldCheck, ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import api from "../utils/api";
import { useUserContext } from "../context/userContext";

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
  const { user, refreshUser, isAuthLoading } = useUserContext();

  const planKey = searchParams.get("plan") || "teacher_pro";
  const billingCycle = searchParams.get("billing") === "termly" ? "termly" : "monthly";
  const planDetails = PLAN_PRICES[planKey];
  const amountInNaira = planDetails?.[billingCycle];

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const userId = user?._id ?? user?.id;
  const coveredBySchool = Boolean(user?.schoolOwnerId);
  const busy = status === "confirming";

  // This function runs AFTER the user successfully pays on Flutterwave
  const handleFlutterwavePayment = useCallback(
    async (response) => {
      setStatus("confirming");
      try {
        // Send the Flutterwave transaction ID to our backend to verify and activate
        await api.post("/payment/verify", { 
          reference: response.transaction_id,
          tx_ref: response.tx_ref
        });
        await refreshUser?.();
        navigate("/admin/dashboard?payment=success", { replace: true });
      } catch (err) {
        setStatus("idle");
        setError(
          err.response?.data?.message || 
          `Payment was successful, but we couldn't activate your plan yet. Please contact support with Transaction ID: ${response.transaction_id}`
        );
      }
    },
    [navigate, refreshUser]
  );

  const config = {
    public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: `noted_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    amount: amountInNaira || 0,
    currency: "NGN",
    payment_options: "card, mobilemoneyghana, ussd",
    customer: {
      email: user?.email || "",
      name: user?.fullName || "Customer",
    },
    customizations: {
      title: "Noted AI Subscription",
      description: `Payment for ${planDetails?.label} (${billingCycle})`,
      logo: "https://www.usenotedai.com/logo.png", // Replace with your actual logo URL
    },
  };

  const handlePayment = (e) => {
    e.preventDefault();
    setError("");

    if (!userId) {
      navigate("/login", { state: { from: `/checkout?plan=${planKey}&billing=${billingCycle}` } });
      return;
    }
    if (!planDetails || !amountInNaira) return setError("That plan doesn't exist. Please pick one from the pricing page.");
    if (coveredBySchool) return setError("Your plan is provided by your school, so you don't need to pay here.");

    // Trigger the Flutterwave modal
    const handleFlutterwave = useFlutterwave(config);
    handleFlutterwave({
      callback: handleFlutterwavePayment,
      onClose: () => {
        setStatus("idle");
        closePaymentModal();
      },
    });
  };

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
          <button onClick={() => navigate("/pricing")} disabled={busy} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" /> Back to Pricing Plans
          </button>
          <h1 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">Secure Checkout</h1>
          <p className="mt-1 text-muted-foreground">Complete your subscription to unlock all features.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <form onSubmit={handlePayment} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Secure payment via Flutterwave</h2>

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="break-words">{error}</p>
                  </div>
                </div>
              )}

              {coveredBySchool && (
                <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                  Your plan is provided by your school. Ask your school admin to upgrade it.
                </p>
              )}

              <div className="space-y-2">
                <label htmlFor="checkout-email" className="text-sm font-medium text-foreground">Email Address</label>
                <input id="checkout-email" type="email" value={user?.email || ""} disabled className="flex h-11 w-full cursor-not-allowed rounded-xl border border-input bg-muted px-4 text-sm text-muted-foreground" />
              </div>

              <button
                type="submit"
                disabled={busy || coveredBySchool}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-base font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy ? (<><Loader2 className="h-5 w-5 animate-spin" /> Activating your plan…</>) : (<><Lock className="h-4 w-4" /> Pay securely ₦{amountInNaira.toLocaleString()}</>)}
              </button>

              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> 256-bit SSL Encrypted</span>
                <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Secured by Flutterwave</span>
              </div>
            </form>
          </div>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}