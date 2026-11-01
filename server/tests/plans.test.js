import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../models/User.js';
import { getCreditsInfo, refundCredits, spendCredits } from '../config/plans.js';

const userId = '65b123456789012345678901';

test('spends credits with an atomic balance condition and reports insufficient credits', async () => {
  const originalUpdateOne = User.updateOne;
  const calls = [];
  let canSpend = true;
  User.updateOne = async (filter, update) => {
    calls.push({ filter, update });
    return { modifiedCount: calls.length === 1 || canSpend ? 1 : 0 };
  };

  try {
    const user = { _id: userId };
    const plan = { credits: 10 };
    assert.equal(await spendCredits(user, plan, 4), true);
    assert.equal(calls[1].filter.aiCreditsUsed.$lte, 6);
    assert.deepEqual(calls[1].update, { $inc: { aiCreditsUsed: 4 } });

    calls.length = 0;
    canSpend = false;
    assert.equal(await spendCredits(user, plan, 4), false);
  } finally {
    User.updateOne = originalUpdateOne;
  }
});

test('refunds only positive credit amounts', async () => {
  const originalUpdateOne = User.updateOne;
  const calls = [];
  User.updateOne = async (filter, update) => {
    calls.push({ filter, update });
    return { modifiedCount: 1 };
  };

  try {
    await refundCredits(userId, 3);
    await refundCredits(userId, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].filter._id, userId);
    assert.equal(calls[0].filter.aiCreditsUsed.$gte, 3);
    assert.deepEqual(calls[0].update, { $inc: { aiCreditsUsed: -3 } });
  } finally {
    User.updateOne = originalUpdateOne;
  }
});

test('reports credit rollover and remaining credits from the active period', () => {
  const active = getCreditsInfo({
    aiCreditsUsed: 4,
    creditsPeriodStart: new Date(Date.now() - 86400000),
  }, { credits: 10 });
  assert.equal(active.total, 10);
  assert.equal(active.used, 4);
  assert.equal(active.remaining, 6);
  assert.ok(active.resetsAt instanceof Date);

  const expired = getCreditsInfo({
    aiCreditsUsed: 9,
    creditsPeriodStart: new Date(Date.now() - 31 * 86400000),
  }, { credits: 10 });
  assert.equal(expired.used, 0);
  assert.equal(expired.remaining, 10);
  assert.equal(expired.resetsAt, null);
});
