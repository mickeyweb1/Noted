import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { User } from '../models/User.js';
import {
  activateFromTransaction,
  initializePaystackTransaction,
  isValidPaystackSignature,
} from '../routes/paymentRoutes.js';

const userId = '65b123456789012345678901';

test('initializes a Paystack checkout with server-selected amount and metadata', async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;
  const originalClientUrl = process.env.CLIENT_URL;
  let requestUrl;
  let requestOptions;
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_not_a_real_key';
  process.env.CLIENT_URL = 'https://app.example.test';
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    const requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/test-code',
          reference: requestBody.reference,
        },
      }),
    };
  };

  try {
    const result = await initializePaystackTransaction({
      user: { _id: userId, email: 'learner@example.test', role: 'teacher' },
      planKey: 'teacher_pro',
      billingCycle: 'monthly',
    });
    const requestBody = JSON.parse(requestOptions.body);

    assert.equal(requestUrl, 'https://api.paystack.co/transaction/initialize');
    assert.equal(requestOptions.method, 'POST');
    assert.equal(requestOptions.headers.Authorization, 'Bearer sk_test_not_a_real_key');
    assert.equal(requestBody.amount, 200000);
    assert.equal(requestBody.currency, 'NGN');
    assert.equal(requestBody.metadata.userId, userId);
    assert.equal(requestBody.metadata.plan, 'teacher_pro');
    assert.equal(requestBody.metadata.billingCycle, 'monthly');
    assert.equal(requestBody.callback_url, 'https://app.example.test/checkout?plan=teacher_pro&billing=monthly');
    assert.equal(result.authorizationUrl, 'https://checkout.paystack.com/test-code');
    assert.ok(result.reference);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = originalSecret;
    if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = originalClientUrl;
  }
});

test('rejects invalid checkout plans and school-plan purchases by non-admins', async () => {
  await assert.rejects(
    initializePaystackTransaction({
      user: { _id: userId, email: 'learner@example.test', role: 'student' },
      planKey: 'school_owner',
      billingCycle: 'monthly',
    }),
    { status: 403 },
  );
  await assert.rejects(
    initializePaystackTransaction({
      user: { _id: userId, email: 'learner@example.test', role: 'teacher' },
      planKey: 'unknown',
      billingCycle: 'monthly',
    }),
    { status: 400 },
  );
  await assert.rejects(
    initializePaystackTransaction({
      user: {
        _id: userId,
        email: 'learner@example.test',
        role: 'student',
        schoolId: '65b123456789012345678903',
      },
      planKey: 'teacher_pro',
      billingCycle: 'monthly',
    }),
    { status: 403 },
  );
});

test('activates only a verified exact-amount payment and atomically rejects duplicate references', async () => {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const appliedReferences = new Set();
  const user = {
    _id: userId,
    role: 'school_admin',
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    subscriptionEndsAt: null,
    maxTeachersAllowed: 30,
  };
  let updateQuery;
  let updatePayload;
  User.findById = () => ({ select: async () => user });
  User.findOneAndUpdate = async (query, update) => {
    updateQuery = query;
    updatePayload = update;
    const reference = query.paymentReferences.$ne;
    if (appliedReferences.has(reference)) return null;
    appliedReferences.add(reference);
    Object.assign(user, update.$set);
    return user;
  };

  const transaction = {
    status: 'success',
    reference: 'paystack_test_reference',
    currency: 'NGN',
    amount: 5000000,
    metadata: { userId, plan: 'school_pro', billingCycle: 'termly' },
  };

  try {
    assert.equal((await activateFromTransaction({ ...transaction, status: 'failed' })).status, 'rejected');
    assert.equal((await activateFromTransaction({ ...transaction, amount: 500000 })).status, 'rejected');

    const firstActivation = await activateFromTransaction(transaction);
    assert.equal(firstActivation.status, 'activated');
    assert.equal(user.subscriptionTier, 'school_pro');
    assert.equal(user.maxTeachersAllowed, 13);
    assert.equal(updateQuery.paymentReferences.$ne, transaction.reference);
    assert.deepEqual(updatePayload.$addToSet, { paymentReferences: transaction.reference });

    const duplicateActivation = await activateFromTransaction(transaction);
    assert.equal(duplicateActivation.status, 'duplicate');
  } finally {
    User.findById = originalFindById;
    User.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('rejects transactions without a provider reference before updating an account', async () => {
  const result = await activateFromTransaction({
    status: 'success',
    currency: 'NGN',
    amount: 200000,
    metadata: { userId, plan: 'teacher_pro', billingCycle: 'monthly' },
  });
  assert.equal(result.status, 'rejected');
});

test('validates Paystack webhook signatures against the exact raw request body', () => {
  const secret = 'test-only-paystack-secret';
  const rawBody = Buffer.from('{"event":"charge.success","data":{"reference":"test"}}');
  const signature = createHmac('sha512', secret).update(rawBody).digest('hex');
  assert.equal(isValidPaystackSignature(rawBody, signature, secret), true);
  assert.equal(isValidPaystackSignature(Buffer.from(`${rawBody.toString()} `), signature, secret), false);
  assert.equal(isValidPaystackSignature(rawBody, 'invalid', secret), false);
});
