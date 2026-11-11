

/*
 * Server-side prices in NAIRA. This is the AUTHORITY: the webhook checks every payment against it.
 * Keep it in sync with the pricing page and the checkout page.
 */
export const PRICES = {
  teacher_pro:    { tier: 'pro',            monthly: 2000,  termly: 5500,   label: 'Teacher Pro' },
  teacher_premium:{ tier: 'premium',        monthly: 5000,  termly: 13000,  label: 'Teacher Premium' },
  school_owner:   { tier: 'school_owner',   monthly: 10000, termly: 25000,  label: 'School Starter' },
  school_pro:     { tier: 'school_pro',     monthly: 25000, termly: 65000,  label: 'School Pro' },
  school_premium: { tier: 'school_premium', monthly: 50000, termly: 130000, label: 'School Premium' },
};
