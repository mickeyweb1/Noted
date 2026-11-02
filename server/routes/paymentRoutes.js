import { randomUUID, timingSafeEqual } from 'node:crypto';
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

export const isValidFlutterwaveSignature = (signature, secretHash) => {
  if (typeof signature !== 'string' || typeof secretHash !== 'string' || !secretHash) {
    return false;
  }
  const received = Buffer.from(signature);
  const expected = Buffer.from(secretHash);
  return received.length === expected.length && timingSafeEqual(received, expected);
};

const flutterwaveRequest = async (path, options = {}) => {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) throw httpError('Payments are not configured.', 503);

  let response;
  try {
    response = await fetch(`https://api.flutterwave.com/v3${path}`, {
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
      throw httpError('Flutterwave did not respond in time. Please try again.', 504);
    }
    throw httpError('Flutterwave could not be reached. Please try again.', 502);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status !== 'success' || !body.data) {
    throw httpError('Flutterwave could not complete the payment request. Please try again.', 502);
  }
  return body.data;
};

export const initializeFlutterwaveTransaction = async ({ user, planKey, billingCycle }) => {
  const plan = hasOwn(PRICES, planKey) ? PRICES[planKey] : null;
  if (!plan || !['monthly', 'termly'].includes(billingCycle)) {
    throw httpError('Choose a valid plan and billing cycle.', 400);
  }
  if (plan.tier.startsWith('school_') && user.role !== 'school_admin') {
    throw httpError('Only a school administrator can purchase a school plan.', 403);
  }
  if (
    user.schoolOwnerId ||
    (user.schoolId && ['student', 'teacher'].includes(user.role))
  ) {
    throw httpError('Your plan is provided by your school.', 403);
  }
  if (typeof user.email !== 'string' || !user.email.trim()) {
    throw httpError('A valid account email is required for checkout.', 400);
  }

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const reference = `noted_${randomUUID()}`;
  const amount = plan[billingCycle];
  const transaction = await flutterwaveRequest('/payments', {
    method: 'POST',
    body: JSON.stringify({
      tx_ref: reference,
      amount,
      currency: 'NGN',
      redirect_url: `${clientUrl}/checkout?plan=${encodeURIComponent(planKey)}&billing=${billingCycle}`,
      customer: { email: user.email },
      meta: {
        userId: String(user._id),
        plan: planKey,
        billingCycle,
      },
      customizations: { title: 'Noted AI Subscription', description: plan.label },
    }),
  });

  if (typeof transaction.link !== 'string' || !transaction.link) {
    throw httpError('Flutterwave returned an invalid checkout session. Please try again.', 502);
  }

  return { authorizationUrl: transaction.link, reference };
};

export const verifyFlutterwaveTransaction = async (transactionId) => {
  const transaction = await flutterwaveRequest(
    `/transactions/${encodeURIComponent(transactionId)}/verify`,
  );
  if (String(transaction.id) !== transactionId) {
    throw httpError('Flutterwave returned an invalid transaction. Please try again.', 502);
  }
  return {
    ...transaction,
    reference: transaction.tx_ref,
    metadata: transaction.meta ?? transaction.metadata,
  };
};

export const activateFromTransaction = async (transaction) => {
  if (!transaction || transaction.status !== 'successful') {
    return { status: 'rejected', reason: 'Transaction was not successful.' };
  }

  const metadata = transaction.meta || transaction.metadata || {};
  const planKey = metadata.plan;
  const billingCycle = metadata.billingCycle;
  const transactionReference = transaction.tx_ref || transaction.reference;
  const reference = typeof transactionReference === 'string' ? transactionReference.trim() : '';
  const plan = hasOwn(PRICES, planKey) ? PRICES[planKey] : null;

  if (
    !plan ||
    !['monthly', 'termly'].includes(billingCycle) ||
    !mongoose.isValidObjectId(metadata.userId) ||
    !reference
  ) {
    return { status: 'rejected', reason: 'Unknown plan, billing cycle, user, or transaction reference.' };
  }

  const expectedAmountNaira = plan[billingCycle];
  if (
    transaction.currency !== 'NGN' ||
    !Number.isSafeInteger(Number(transaction.amount)) ||
    Number(transaction.amount) !== expectedAmountNaira
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
    const data = await initializeFlutterwaveTransaction({ user: req.user, planKey, billingCycle });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.post('/verify', protect, async (req, res, next) => {
  try {
    const transactionId = typeof req.body?.transactionId === 'string'
      ? req.body.transactionId.trim()
      : '';
    const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    if (!/^\d{1,30}$/.test(transactionId) || !reference || reference.length > 100) {
      return res.status(400).json({ success: false, message: 'A valid transaction is required.' });
    }

    const transaction = await verifyFlutterwaveTransaction(transactionId);
    if (
      transaction.reference !== reference ||
      String(transaction.metadata?.userId) !== String(req.user._id)
    ) {
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

router.post('/webhook', async (req, res, next) => {
  try {
    const secretHash = process.env.FLW_SECRET_HASH;
    if (!secretHash) throw httpError('Payment webhooks are not configured.', 503);
    if (!isValidFlutterwaveSignature(req.get('verif-hash'), secretHash)) {
      return res.status(401).json({ success: false, message: 'Invalid payment signature.' });
    }

    if (
      req.body?.event !== 'charge.completed' ||
      req.body?.data?.status !== 'successful' ||
      req.body?.data?.id == null
    ) {
      return res.json({ success: true, ignored: true });
    }

    const transaction = await verifyFlutterwaveTransaction(String(req.body.data.id));
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
