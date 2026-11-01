import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { protect } from '../middleware/protect.js';
import { PLANS } from '../config/plans.js';
import { PRICES } from '../config/prices.js';

const router = express.Router();

// Calendar-safe month add (Jan 31 + 1 month = Feb 28/29, not Mar 3).
const addMonths = (date, n) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

const reject = (reason) => ({ status: 'rejected', reason });

router.post('/initialize', protect, async (req, res, next) => {
  try {
    const planKey = typeof req.body?.plan === 'string' ? req.body.plan : '';
    const billingCycle = req.body?.billingCycle;
    const plan = Object.prototype.hasOwnProperty.call(PRICES, planKey) ? PRICES[planKey] : null;

    if (!plan || !['monthly', 'termly'].includes(billingCycle)) {
      return res.status(400).json({ success: false, message: 'Choose a valid plan and billing cycle.' });
    }
    if (req.user.schoolOwnerId) {
      return res.status(403).json({ success: false, message: 'Your plan is provided by your school.' });
    }
    if (!process.env.PAYSTACK_SECRET_KEY || !process.env.CLIENT_URL) {
      return res.status(500).json({ success: false, message: 'Payments are not configured.' });
    }

    const callbackUrl = new URL('/checkout', process.env.CLIENT_URL);
    callbackUrl.searchParams.set('plan', planKey);
    callbackUrl.searchParams.set('billing', billingCycle);

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user.email,
        amount: plan[billingCycle] * 100,
        currency: 'NGN',
        reference: `noted_${crypto.randomUUID()}`,
        callback_url: callbackUrl.toString(),
        metadata: { userId: String(req.user._id), plan: planKey, billingCycle },
      }),
    });
    const body = await paystackResponse.json().catch(() => null);
    if (!paystackResponse.ok || !body?.status || !body.data?.authorization_url) {
      console.error('Paystack transaction initialization failed:', body?.message || paystackResponse.status);
      return res.status(502).json({ success: false, message: 'Could not start payment with Paystack. Please try again.' });
    }

    return res.json({
      success: true,
      data: {
        authorization_url: body.data.authorization_url,
        reference: body.data.reference,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Turns a successful Paystack transaction into a subscription.
 * Used by BOTH the webhook and /verify, so it must be safe to run more than once:
 *  - the amount is checked against the server price table (the browser can't be trusted)
 *  - each Paystack reference is applied only once
 *  - renewing the same plan early extends from the current end date instead of losing days
 */
export const activateFromTransaction = async (tx) => {
  if (!tx || tx.status !== 'success') return reject('Transaction was not successful.');
  if (typeof tx.reference !== 'string' || !tx.reference) return reject('Transaction has no reference.');

  const meta = tx.metadata || {};
  const plan = Object.prototype.hasOwnProperty.call(PRICES, meta.plan) ? PRICES[meta.plan] : null;
  if (!['monthly', 'termly'].includes(meta.billingCycle)) return reject('Unknown billing cycle.');
  const cycle = meta.billingCycle;
  if (!plan || !mongoose.isValidObjectId(meta.userId)) return reject('Unknown plan or user in the payment metadata.');

  const expectedKobo = plan[cycle] * 100;
  if (tx.currency !== 'NGN' || Number(tx.amount) !== expectedKobo) {
    return reject(`Amount mismatch: paid ${tx.amount} ${tx.currency}, expected ${expectedKobo} NGN kobo for ${meta.plan} (${cycle}).`);
  }

  const user = await User.findById(meta.userId).select('subscriptionTier subscriptionStatus subscriptionEndsAt maxTeachersAllowed');
  if (!user) return reject('User not found.');

  const now = new Date();
  const stillLive = user.subscriptionStatus === 'active' && user.subscriptionEndsAt && user.subscriptionEndsAt > now;
  const sameTier = Boolean(stillLive) && user.subscriptionTier === plan.tier;
  const endsAt = addMonths(sameTier ? user.subscriptionEndsAt : now, cycle === 'termly' ? 3 : 1);

  const set = {
    subscriptionTier: plan.tier,
    subscriptionStatus: 'active',
    billingCycle: cycle,
    subscriptionEndsAt: endsAt,
  };
  // New plan (or a lapsed one) starts with fresh credits. An early renewal keeps the current usage.
  if (!sameTier) {
    set.aiCreditsUsed = 0;
    set.creditsPeriodStart = now;
  }
  if (plan.tier.startsWith('school_')) {
    set.isSchoolOwner = true;
    set.maxTeachersAllowed = Math.max(user.maxTeachersAllowed || 0, PLANS[plan.tier].teachers);
  }

  // The `$ne` filter makes this atomic: a repeated reference matches nothing and is skipped.
  const updated = await User.findOneAndUpdate(
    { _id: user._id, paymentReferences: { $ne: tx.reference } },
    { $set: set, $addToSet: { paymentReferences: tx.reference } },
    { new: true, runValidators: true }
  );

  if (!updated) return { status: 'duplicate', tier: user.subscriptionTier };
  return { status: 'activated', tier: updated.subscriptionTier, endsAt };
};

/* ------------------------------------------------------------------ */
/* Paystack webhook (server to server)                                 */
/* ------------------------------------------------------------------ */
// Needs req.rawBody: see the express.json({ verify }) change in server.js.
router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error('❌ PAYSTACK_SECRET_KEY is not set; cannot verify webhooks.');
      return res.status(500).json({ success: false, message: 'Payments are not configured.' });
    }

    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const expected = Buffer.from(crypto.createHmac('sha512', secret).update(raw).digest('hex'));
    const received = Buffer.from(String(req.headers['x-paystack-signature'] || ''));
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    if (req.body?.event === 'charge.success') {
      const result = await activateFromTransaction(req.body.data);
      if (result.status === 'rejected') {
        // Answer 200 anyway: retrying a bad payment won't fix it. Check the logs and refund/fix by hand.
        console.error(`⚠️ Payment not applied (${req.body.data?.reference}): ${result.reason}`);
      } else {
        console.log(`✅ Payment ${result.status}: ${req.body.data?.reference} -> ${result.tier}`);
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    // 500 makes Paystack retry later, which is what we want for temporary DB errors.
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

/* ------------------------------------------------------------------ */
/* Verify right after checkout, so the plan is live without waiting    */
/* for the webhook. Safe to call alongside the webhook (idempotent).   */
/* ------------------------------------------------------------------ */
router.post('/verify', protect, async (req, res, next) => {
  try {
    const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    if (!reference || reference.length > 100) {
      return res.status(400).json({ success: false, message: 'A payment reference is required.' });
    }
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'Payments are not configured.' });
    }

    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const body = await psRes.json().catch(() => null);
    if (!psRes.ok || !body?.status || !body.data) {
      return res.status(400).json({ success: false, message: 'Paystack could not confirm this payment yet.' });
    }

    const tx = body.data;
    // You can only claim your own payment.
    if (String(tx.metadata?.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This payment belongs to a different account.' });
    }

    const result = await activateFromTransaction(tx);
    if (result.status === 'rejected') return res.status(400).json({ success: false, message: result.reason });

    res.json({ success: true, activated: true, tier: result.tier });
  } catch (error) { next(error); }
});

export default router;
