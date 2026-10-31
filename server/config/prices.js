/*
 * Server-side prices in NAIRA. This is the AUTHORITY: the webhook checks every payment against it.
 * Keep it in sync with the pricing page and the checkout page.
 *
 * The keys are the plan IDs sent by the checkout page (?plan=...).
 * `tier` is what gets saved in User.subscriptionTier (must match config/plans.js and the User enum).
 * NOTE: teacher_pro -> 'pro' and teacher_premium -> 'premium'. Saving 'teacher_pro' directly
 * would silently give the user the Free plan.
 */
export const PRICES = {
  teacher_pro:    { tier: 'pro',            monthly: 2000,  termly: 5000,   label: 'Teacher Pro' },
  teacher_premium:{ tier: 'premium',        monthly: 4000,  termly: 10000,  label: 'Teacher Premium' },
  school_owner:   { tier: 'school_owner',   monthly: 8000,  termly: 20000,  label: 'School Starter' },
  school_pro:     { tier: 'school_pro',     monthly: 20000, termly: 50000,  label: 'School Pro' },
  school_premium: { tier: 'school_premium', monthly: 40000, termly: 100000, label: 'School Premium' },
};
