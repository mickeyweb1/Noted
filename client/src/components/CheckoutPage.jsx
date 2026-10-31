import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CreditCard, Lock, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
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
  const { user } = useUserContext();

  const planKey = searchParams.get("plan") || "teacher_pro";
  const billingCycle = searchParams.get("billing") || "monthly";
  
  const planDetails = PLAN_PRICES[planKey] || PLAN_PRICES.teacher_pro;
  const amountInNaira = planDetails[billingCycle];
  const amountInKobo = amountInNaira * 100; 

  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = (e) => {
    e.preventDefault();
    if (!user?._id) {
      alert("Please log in to complete your purchase.");
      navigate("/login");
      return;
    }
    
    setIsProcessing(true);

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => {
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY, 
        email: user.email,
        amount: amountInKobo,
        currency: "NGN",
        ref: new Date().getTime().toString(),
        metadata: {
          userId: user._id,
          plan: planKey,
          billingCycle: billingCycle,
        },
        callback: function (response) {
          setIsProcessing(false);
          navigate("/admin/dashboard?payment=success");
        },
        onClose: function () {
          setIsProcessing(false);
        },
      });
      handler.openIframe();
    };
    document.body.appendChild(script);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button onClick={() => navigate("/pricing")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Pricing Plans
          </button>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mt-4">Secure Checkout</h1>
          <p className="text-muted-foreground mt-1">Complete your subscription to unlock all features.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <form onSubmit={handlePayment} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Card Payment via Paystack</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <input type="email" value={user?.email || ""} disabled className="flex h-11 w-full rounded-xl border border-input bg-muted px-4 text-sm text-muted-foreground cursor-not-allowed" />
              </div>
              <button type="submit" disabled={isProcessing} className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-brand text-brand-foreground font-semibold text-base shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4">
                {isProcessing ? (
                  <><span className="w-5 h-5 border-2 border-brand-foreground/30 border-t-brand-foreground rounded-full animate-spin" /> Opening Secure Payment...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Pay Securely ₦{amountInNaira.toLocaleString()}</>
                )}
              </button>
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> 256-bit SSL Encrypted</span>
                <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Secured by Paystack</span>
              </div>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
              <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">{planDetails.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{billingCycle} Billing</p>
                  </div>
                  <p className="font-bold text-foreground">₦{amountInNaira.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="text-base font-semibold text-foreground">Total Due Today</span>
                  <span className="text-xl font-display font-bold text-brand">₦{amountInNaira.toLocaleString()}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Access Includes:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-foreground"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Higher AI question limits</li>
                  <li className="flex items-center gap-2 text-sm text-foreground"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Remove "Noted AI" branding</li>
                  <li className="flex items-center gap-2 text-sm text-foreground"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Secure result sharing & Offline support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}