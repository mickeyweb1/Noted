import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePaystackPayment } from 'react-paystack';
import { CreditCard, Lock, ShieldCheck, ArrowLeft, Tag, Calendar, CheckCircle2 } from "lucide-react";
import { useUserContext } from "../context/userContext";

// Map plan keys to their actual NGN prices based on your pricing page
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
  
  // Paystack requires amount in kobo (multiply by 100)
  const amountInKobo = amountInNaira * 100; 

  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  // Paystack configuration
  const config = {
    reference: new Date().getTime().toString(),
    email: user?.email || "customer@example.com",
    amount: amountInKobo,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxxxxx", // Ensure this is in your frontend .env
    metadata: {
      userId: user?._id,
      plan: planKey,
      billingCycle: billingCycle,
    },
  };

  // Paystack hooks
  const initializePayment = usePaystackPayment(config);

  const onSuccess = (response) => {
    // Payment was successful! 
    // The backend webhook will handle updating the database.
    // We just redirect the user to the dashboard or a success page.
    setIsProcessing(false);
    navigate("/admin/dashboard?payment=success");
  };

  const onClose = () => {
    setIsProcessing(false);
    // User closed the Paystack popup
  };

  const handlePayment = (e) => {
    e.preventDefault();
    if (!user?._id) {
      alert("Please log in to complete your purchase.");
      navigate("/login");
      return;
    }
    
    setIsProcessing(true);
    // This triggers the Paystack popup
    initializePayment(onSuccess, onClose);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header / Back Button */}
        <div className="mb-8">
          <button 
            onClick={() => navigate("/pricing")} 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Pricing Plans
          </button>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mt-4">Secure Checkout</h1>
          <p className="text-muted-foreground mt-1">Complete your subscription to unlock all features.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* ================= LEFT SIDE: PAYMENT FORM ================= */}
          <div className="lg:col-span-3 space-y-6">
            <form onSubmit={handlePayment} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Card Payment via Paystack</h2>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="flex h-11 w-full rounded-xl border border-input bg-muted px-4 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>

              {/* Promo Code */}
              <div className="pt-4 border-t border-border">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" /> Promo / School Discount Code
                </label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code (Optional)"
                    className="flex h-11 flex-1 rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                  <button type="button" className="px-5 h-11 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
                    Apply
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-brand text-brand-foreground font-semibold text-base shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isProcessing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-brand-foreground/30 border-t-brand-foreground rounded-full animate-spin" />
                    Opening Secure Payment...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Pay Securely ₦{amountInNaira.toLocaleString()}
                  </>
                )}
              </button>

              {/* Security Badges */}
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> 256-bit SSL Encrypted</span>
                <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Secured by Paystack</span>
              </div>
            </form>
          </div>

          {/* ================= RIGHT SIDE: ORDER SUMMARY ================= */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
              
              {/* Plan Details */}
              <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">{planDetails.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{billingCycle} Billing</p>
                  </div>
                  <p className="font-bold text-foreground">₦{amountInNaira.toLocaleString()}</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="text-base font-semibold text-foreground">Total Due Today</span>
                  <span className="text-xl font-display font-bold text-brand">₦{amountInNaira.toLocaleString()}</span>
                </div>
              </div>

              {/* What's Included Reminder */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Access Includes:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    Higher AI question limits
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    Remove "Noted AI" branding
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    Secure result sharing & Offline support
                  </li>
                </ul>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-2">
                You will be billed ₦{amountInNaira.toLocaleString()} {billingCycle === 'monthly' ? 'monthly' : 'per term'}. 
                You can cancel at any time in your Billing Settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
