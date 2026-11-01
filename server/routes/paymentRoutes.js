import { randomUUID } from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { protect } from '../middleware/protect.js';
import { PLANS } from '../config/plans.js';
import { PRICES } from '../config/prices.js';

const router = express.Router();
const httpError = (message, status = 500) => Object.assign(new Error(message), { status });
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const addMonths = (date, months) => {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < day) result.setDate(0);
  return result;
};

const paystackRequest = async (path, options = {}) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw httpError('Payments are not configured.', 503);

  let response;
  try {
    response = await fetch(`https://api.paystack.co${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw httpError('Paystack did not respond in time. Please try again.', 504);
    }
    throw httpError('Paystack could not be reached. Please try again.', 502);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status !== true || !body.data) {
    throw httpError('Paystack could not complete the payment request. Please try again.', 502);
  }
  return body.data;
};

export const initializePaystackTransaction = async ({ user, planKey, billingCycle }) => {
  const plan = hasOwn(PRICES, planKey) ? PRICES[planKey] : null;
  if (!plan || !['monthly', 'termly'].includes(billingCycle)) {
    throw httpError('Choose a valid plan and billing cycle.', 400);
  }
  if (plan.tier.startsWith('school_') && user.role !== 'school_admin') {
    throw httpError('Only a school administrator can purchase a school plan.', 403);
  }
  if (user.schoolOwnerId) {
    throw httpError('Your plan is provided by your school.', 403);
  }
  if (typeof user.email !== 'string' || !user.email.trim()) {
    throw httpError('A valid account email is required for checkout.', 400);
  }

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const reference = `noted_${randomUUID()}`;
  const amount = plan[billingCycle];
  const transaction = await paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      amount: amount * 100,
      currency: 'NGN',
      reference,
      callback_url: `${clientUrl}/checkout?plan=${encodeURIComponent(planKey)}&billing=${billingCycle}`,
      metadata: {
        userId: String(user._id),
        plan: planKey,
        billingCycle,
      },
    }),
  });

  if (typeof transaction.authorization_url !== 'string' || transaction.reference !== reference) {
    throw httpError('Paystack returned an invalid checkout session. Please try again.', 502);
  }

  return { authorizationUrl: transaction.authorization_url, reference };
};

export const activateFromTransaction = async (transaction) => {
  if (!transaction || transaction.status !== 'success') {
    return { status: 'rejected', reason: 'Transaction was not successful.' };
  }

  const metadata = transaction.metadata || {};
  const planKey = metadata.plan;
  const billingCycle = metadata.billingCycle;
  const reference = typeof transaction.reference === 'string' ? transaction.reference.trim() : '';
  const plan = hasOwn(PRICES, planKey) ? PRICES[planKey] : null;

  if (
    !plan ||
    !['monthly', 'termly'].includes(billingCycle) ||
    !mongoose.isValidObjectId(metadata.userId) ||
    !reference
  ) {
    return { status: 'rejected', reason: 'Unknown plan, billing cycle, user, or transaction reference.' };
  }

  const expectedAmountKobo = plan[billingCycle] * 100;
  if (
    transaction.currency !== 'NGN' ||
    !Number.isSafeInteger(Number(transaction.amount)) ||
    Number(transaction.amount) !== expectedAmountKobo
  ) {
    return { status: 'rejected', reason: 'The transaction amount or currency does not match this plan.' };
  }

  const user = await User.findById(metadata.userId)
    .select('role subscriptionTier subscriptionStatus subscriptionEndsAt maxTeachersAllowed');
  if (!user) return { status: 'rejected', reason: 'User not found.' };
  if (plan.tier.startsWith('school_') && user.role !== 'school_admin') {
    return { status: 'rejected', reason: 'This account cannot activate a school plan.' };
  }

  const now = new Date();
  const stillLive = user.subscriptionStatus === 'active' && user.subscriptionEndsAt && user.subscriptionEndsAt > now;
  const sameTier = Boolean(stillLive) && user.subscriptionTier === plan.tier;
  const endsAt = addMonths(sameTier ? user.subscriptionEndsAt : now, billingCycle === 'termly' ? 3 : 1);
  const update = {
    subscriptionTier: plan.tier,
    subscriptionStatus: 'active',
    billingCycle,
    subscriptionEndsAt: endsAt,
  };

  if (!sameTier) {
    update.aiCreditsUsed = 0;
    update.creditsPeriodStart = now;
  }
  if (plan.tier.startsWith('school_')) {
    update.isSchoolOwner = true;
    update.maxTeachersAllowed = PLANS[plan.tier].teachers;
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id, paymentReferences: { $ne: reference } },
    { $set: update, $addToSet: { paymentReferences: reference } },
    { new: true, runValidators: true },
  );
  if (!updatedUser) return { status: 'duplicate', tier: user.subscriptionTier };
  return { status: 'activated', tier: updatedUser.subscriptionTier, endsAt };
};

router.post('/initialize', protect, async (req, res, next) => {
  try {
    const planKey = typeof req.body?.plan === 'string' ? req.body.plan : '';
    const billingCycle = req.body?.billingCycle;
    const data = await initializePaystackTransaction({ user: req.user, planKey, billingCycle });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.post('/verify', protect, async (req, res, next) => {
  try {
    const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    if (!reference || reference.length > 100) {
      return res.status(400).json({ success: false, message: 'A valid transaction reference is required.' });
    }

    const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (String(transaction.metadata?.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This payment belongs to a different account.' });
    }

    const result = await activateFromTransaction(transaction);
    if (result.status === 'rejected') {
      return res.status(400).json({ success: false, message: result.reason });
    }
    return res.json({ success: true, activated: true, tier: result.tier });
  } catch (error) {
    return next(error);
  }
});

export default router;
