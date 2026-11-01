import express from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { protect } from '../middleware/protect.js';
import { PLANS } from '../config/plans.js';
import { PRICES } from '../config/prices.js';

const router = express.Router();

const addMonths = (date, n) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

const reject = (reason) => ({ status: 'rejected', reason });

export const activateFromTransaction = async (txData) => {
  if (!txData || txData.status !== 'successful') return reject('Transaction was not successful.');
  
  const meta = txData.meta || {};
  const planKey = meta.plan;
  const billingCycle = meta.billingCycle;
  const plan = Object.prototype.hasOwnProperty.call(PRICES, planKey) ? PRICES[planKey] : null;
  
  if (!plan || !['monthly', 'termly'].includes(billingCycle) || !mongoose.isValidObjectId(meta.userId)) {
    return reject('Unknown plan, billing cycle, or user in the payment metadata.');
  }

  const expectedAmount = plan[billingCycle];
  if (txData.currency !== 'NGN' || Number(txData.amount) !== expectedAmount) {
    return reject(`Amount mismatch: paid ${txData.amount} ${txData.currency}, expected ${expectedAmount} NGN.`);
  }

  const user = await User.findById(meta.userId).select('subscriptionTier subscriptionStatus subscriptionEndsAt maxTeachersAllowed');
  if (!user) return reject('User not found.');

  const now = new Date();
  const stillLive = user.subscriptionStatus === 'active' && user.subscriptionEndsAt && user.subscriptionEndsAt > now;
  const sameTier = Boolean(stillLive) && user.subscriptionTier === plan.tier;
  const endsAt = addMonths(sameTier ? user.subscriptionEndsAt : now, billingCycle === 'termly' ? 3 : 1);

  const set = {
    subscriptionTier: plan.tier,
    subscriptionStatus: 'active',
    billingCycle: billingCycle,
    subscriptionEndsAt: endsAt,
  };

  if (!sameTier) {
    set.aiCreditsUsed = 0;
    set.creditsPeriodStart = now;
  }
  if (plan.tier.startsWith('school_')) {
    set.isSchoolOwner = true;
    set.maxTeachersAllowed = Math.max(user.maxTeachersAllowed || 0, PLANS[plan.tier].teachers);
  }

  const txRef = txData.tx_ref;
  const updated = await User.findOneAndUpdate(
    { _id: user._id, paymentReferences: { $ne: txRef } },
    { $set: set, $addToSet: { paymentReferences: txRef } },
    { new: true, runValidators: true }
  );

  if (!updated) return { status: 'duplicate', tier: user.subscriptionTier };
  return { status: 'activated', tier: updated.subscriptionTier, endsAt };
};

/* ------------------------------------------------------------------ */
/* Verify right after checkout                                         */
/* ------------------------------------------------------------------ */
router.post('/verify', protect, async (req, res, next) => {
  try {
    const transactionId = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'A transaction ID is required.' });
    }
    if (!process.env.FLW_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'Payments are not configured.' });
    }

    // Verify with Flutterwave API
    const flwRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: { 
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
    });
    
    const body = await flwRes.json().catch(() => null);
    if (!flwRes.ok || !body?.status || !body.data) {
      return res.status(400).json({ success: false, message: 'Flutterwave could not confirm this payment yet.' });
    }

    const txData = body.data;
    
    // Security: Ensure the user paying is the one claiming the upgrade
    if (String(txData.meta?.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This payment belongs to a different account.' });
    }

    const result = await activateFromTransaction(txData);
    if (result.status === 'rejected') {
      return res.status(400).json({ success: false, message: result.reason });
    }

    res.json({ success: true, activated: true, tier: result.tier });
  } catch (error) { 
    console.error("Payment verify error:", error);
    next(error); 
  }
});

export default router;