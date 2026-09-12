import { useState } from "react";
import { 
  CreditCard, 
  Building2, 
  Lock, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft,
  Tag,
  Calendar
} from "lucide-react";
import { NavLink } from "react-router-dom";

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState("card"); // 'card' or 'transfer'
  const [promoCode, setPromoCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock data representing the plan the user selected on the previous page.
  // Your backend will pass this data via URL params or state.
  const selectedPlan = {
    name: "Premium School Plan",
    type: "Per Student / Month",
    price: 1500,
    quantity: 5, // Mock: Admin is paying for 5 students
  };

  const subtotal = selectedPlan.price * selectedPlan.quantity;
  const discount = 0; // Mock discount if they use a promo code
  const total = subtotal - discount;

  const handlePayment = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate backend payment gateway call (Paystack/Flutterwave)
    setTimeout(() => {
      setIsProcessing(false);
      // navigate("/admin/dashboard?payment=success");
      alert("Payment Successful! (This is a mock UI. Backend will handle the real transaction).");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header / Back Button */}
        <div className="mb-8">
          <NavLink 
            to="/admin/billing" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Pricing Plans
          </NavLink>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mt-4">Secure Checkout</h1>
          <p className="text-muted-foreground mt-1">Complete your subscription to unlock all features.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* ================= LEFT SIDE: PAYMENT FORM (3 Columns) ================= */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 1. Payment Method Selection */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Select Payment Method</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === "card" 
                      ? "border-brand bg-brand/5" 
                      : "border-border bg-background hover:border-muted-foreground/30"
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === "card" ? "text-brand" : "text-muted-foreground"}`} />
                  <span className={`font-medium text-sm ${paymentMethod === "card" ? "text-brand" : "text-foreground"}`}>Credit/Debit Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("transfer")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === "transfer" 
                      ? "border-brand bg-brand/5" 
                      : "border-border bg-background hover:border-muted-foreground/30"
                  }`}
                >
                  <Building2 className={`w-5 h-5 ${paymentMethod === "transfer" ? "text-brand" : "text-muted-foreground"}`} />
                  <span className={`font-medium text-sm ${paymentMethod === "transfer" ? "text-brand" : "text-foreground"}`}>Bank Transfer</span>
                </button>
              </div>
            </div>

            {/* 2. Payment Details Form */}
            <form onSubmit={handlePayment} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                {paymentMethod === "card" ? "Card Details" : "Bank Transfer Details"}
              </h2>

              {paymentMethod === "card" ? (
                <>
                  {/* Cardholder Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Adebayo Johnson"
                      required
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                    />
                  </div>

                  {/* Card Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        required
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 pr-12 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                      />
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Expiry & CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        maxLength="7"
                        required
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength="4"
                        required
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Bank Transfer UI */
                <div className="rounded-xl bg-muted/50 border border-border p-5 space-y-3">
                  <p className="text-sm text-foreground font-medium">Please transfer the exact total amount to the account below:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Bank Name:</span> <span className="font-semibold text-foreground">GTBank (Guaranty Trust)</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Account Number:</span> <span className="font-mono font-bold text-foreground">0123456789</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Account Name:</span> <span className="font-semibold text-foreground">Noted Education Ltd</span></div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <label className="text-sm font-medium text-foreground">Upload Payment Receipt / Reference ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g., TRF-8475920 or upload receipt" 
                      className="flex h-11 w-full mt-2 rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                    />
                  </div>
                </div>
              )}

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
                    placeholder="Enter code"
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
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Pay Securely ₦{total.toLocaleString()}
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

          {/* ================= RIGHT SIDE: ORDER SUMMARY (2 Columns) ================= */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
              
              {/* Plan Details */}
              <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">{selectedPlan.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedPlan.type}</p>
                  </div>
                  <p className="font-bold text-foreground">₦{selectedPlan.price.toLocaleString()}</p>
                </div>
                
                <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50">
                  <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Quantity (Students)</span>
                  <span className="font-medium text-foreground">{selectedPlan.quantity}</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-green-600">- ₦{discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="text-base font-semibold text-foreground">Total Due Today</span>
                  <span className="text-xl font-display font-bold text-brand">₦{total.toLocaleString()}</span>
                </div>
              </div>

              {/* What's Included Reminder */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Premium Access Includes:</p>
                <ul className="space-y-2">
                  {["Full Community Video Library", "Unlimited AI Teacher Chat", "Advanced Analytics", "Priority Support"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Billing Cycle Note */}
              <p className="text-xs text-center text-muted-foreground pt-2">
                You will be billed ₦{total.toLocaleString()} monthly. You can cancel or change student quantities at any time in your Billing Settings.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}