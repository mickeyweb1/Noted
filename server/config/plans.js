import { User } from '../models/User.js';
import { Quiz } from '../models/Quiz.js';
import { Organization } from '../models/Organization.js';

/*
 * SINGLE SOURCE OF TRUTH for plan limits.
 * Keep this in sync with the pricing page.
 */
export const PLANS = {
  free:           { label: 'Free',            credits: 120, maxQ: 30,  codes: 15,  gameShows: 0,  teachers: 0,  branding: true,  share: false, duplicate: false, insights: false },
  pro:            { label: 'Teacher Pro',     credits: 400, maxQ: 60,  codes: 40,  gameShows: 12, teachers: 0,  branding: false, share: true,  duplicate: false, insights: false },
  premium:        { label: 'Teacher Premium', credits: 800, maxQ: 100, codes: 100, gameShows: 30, teachers: 0,  branding: false, share: true,  duplicate: true,  insights: true  },
  school_owner:   { label: 'School Starter',  credits: 400, maxQ: 50,  codes: 30,  gameShows: 8,  teachers: 4,  branding: false, share: true,  duplicate: false, insights: false },
 // Change credits from 500 to 600
school_pro: { label: 'School Pro', credits: 600, maxQ: 80, codes: 50, gameShows: 15, teachers: 13, branding: false, share: true, duplicate: false, insights: true },
  school_premium: { label: 'School Premium',  credits: 800, maxQ: 150, codes: 100, gameShows: 30, teachers: 27, branding: false, share: true,  duplicate: true,  insights: true  },
};

export const SCHOOL_PLAN_TIERS = Object.keys(PLANS).filter((tier) => tier.startsWith('school_'));

const DAY = 86400000;
export const CREDIT_PERIOD_DAYS = 30;

export const LOCKED_MESSAGE =
  'Upgrade Required: This feature is locked because your school admin has not upgraded the subscription yet. Please contact your admin to unlock full access.';

export const PLAN_FIELDS = 'role subscriptionTier subscriptionStatus subscriptionEndsAt schoolOwnerId schoolId aiCreditsUsed creditsPeriodStart';

const UNLIMITED = {
  key: 'super_admin', label: 'Admin', credits: Infinity, maxQ: 9999, codes: 9999, gameShows: Infinity,
  teachers: 9999, branding: false, share: true, duplicate: true, insights: true,
};

const isLive = (u) =>
  u.subscriptionStatus === 'active' && (!u.subscriptionEndsAt || new Date(u.subscriptionEndsAt) > new Date());

export const resolvePlan = async (user) => {
  if (user.role === 'super_admin') return { ...UNLIMITED, locked: null };

  if ((user.role === 'teacher' || user.role === 'student' || user.role === 'hod') && (user.schoolOwnerId || user.schoolId)) {
    let schoolOwnerId = user.schoolOwnerId;
    if (!schoolOwnerId && user.schoolId) {
      const organization = await Organization.findById(user.schoolId).select('adminId');
      schoolOwnerId = organization?.adminId;
    }
    const owner = schoolOwnerId
      ? await User.findById(schoolOwnerId).select('subscriptionTier subscriptionStatus subscriptionEndsAt')
      : null;
      
    if (owner && isLive(owner) && PLANS[owner.subscriptionTier] && owner.subscriptionTier.startsWith('school_')) {
      return { key: owner.subscriptionTier, ...PLANS[owner.subscriptionTier], locked: null };
    }
    
    return { key: 'free', ...PLANS.free, locked: LOCKED_MESSAGE };
  }

  const tier = isLive(user) && PLANS[user.subscriptionTier] ? user.subscriptionTier : 'free';
  return { key: tier, ...PLANS[tier], locked: null };
};

export const getCreditsInfo = (user, plan) => {
  if (!Number.isFinite(plan.credits)) return { total: null, used: 0, remaining: null, resetsAt: null };
  const start = user.creditsPeriodStart ? new Date(user.creditsPeriodStart) : null;
  const expired = !start || Date.now() - start.getTime() > CREDIT_PERIOD_DAYS * DAY;
  const used = expired ? 0 : user.aiCreditsUsed || 0;
  return {
    total: plan.credits,
    used,
    remaining: Math.max(plan.credits - used, 0),
    resetsAt: expired ? null : new Date(start.getTime() + CREDIT_PERIOD_DAYS * DAY),
  };
};

export const spendCredits = async (user, plan, n) => {
  if (!Number.isFinite(plan.credits)) return true;
  const now = new Date();
  const periodAgo = new Date(now.getTime() - CREDIT_PERIOD_DAYS * DAY);

  await User.updateOne(
    { _id: user._id, $or: [{ creditsPeriodStart: null }, { creditsPeriodStart: { $lt: periodAgo } }] },
    { $set: { aiCreditsUsed: 0, creditsPeriodStart: now } }
  );

  const result = await User.updateOne(
    { _id: user._id, aiCreditsUsed: { $lte: plan.credits - n } },
    { $inc: { aiCreditsUsed: n } }
  );
  return result.modifiedCount === 1;
};

export const refundCredits = async (userId, n) => {
  if (!(n > 0)) return;
  await User.updateOne({ _id: userId, aiCreditsUsed: { $gte: n } }, { $inc: { aiCreditsUsed: -n } });
};

export const countGameShowsThisMonth = (userId) =>
  Quiz.countDocuments({ createdBy: userId, gameMode: 'gameShow', createdAt: { $gte: new Date(Date.now() - 30 * DAY) } });

export const gameShowQuotaError = async (user, plan) => {
  if (plan.gameShows === Infinity) return null;
  if (plan.gameShows === 0) return 'Game Show mode is available on Teacher Pro and School plans. Upgrade to unlock it!';
  const used = await countGameShowsThisMonth(user._id);
  return used >= plan.gameShows ? `Your plan allows ${plan.gameShows} Game Shows per month. Upgrade for more!` : null;
};
