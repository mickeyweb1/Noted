import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../models/User.js';
import {
  activateFromTransaction,
  initializeFlutterwaveTransaction,
  isValidFlutterwaveSignature,
  verifyFlutterwaveTransaction,
} from '../routes/paymentRoutes.js';

const userId = '65b123456789012345678901';

test('initializes a Flutterwave checkout with server-selected amount and metadata', async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.FLW_SECRET_KEY;
  const originalClientUrl = process.env.CLIENT_URL;
  let requestUrl;
  let requestOptions;
  process.env.FLW_SECRET_KEY = 'FLWSECK_TEST-not-a-real-key';
  process.env.CLIENT_URL = 'https://app.example.test';
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    const requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        status: 'success',
        data: {
          link: 'https://checkout.flutterwave.com/test-code',
          tx_ref: requestBody.tx_ref,
        },
      }),
    };
  };

  try {
    const result = await initializeFlutterwaveTransaction({
      user: { _id: userId, email: 'learner@example.test', role: 'teacher' },
      planKey: 'teacher_pro',
      billingCycle: 'monthly',
    });
    const requestBody = JSON.parse(requestOptions.body);

    assert.equal(requestUrl, 'https://api.flutterwave.com/v3/payments');
    assert.equal(requestOptions.method, 'POST');
    assert.equal(requestOptions.headers.Authorization, 'Bearer sk_test_not_a_real_key');
    assert.equal(requestBody.amount, 2000);
    assert.equal(requestBody.currency, 'NGN');
    assert.equal(requestBody.meta.userId, userId);
    assert.equal(requestBody.meta.plan, 'teacher_pro');
    assert.equal(requestBody.meta.billingCycle, 'monthly');
    assert.equal(requestBody.redirect_url, 'https://app.example.test/checkout?plan=teacher_pro&billing=monthly');
    assert.equal(result.authorizationUrl, 'https://checkout.flutterwave.com/test-code');
    assert.ok(result.reference);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.FLW_SECRET_KEY;
    else process.env.FLW_SECRET_KEY = originalSecret;
    if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = originalClientUrl;
  }
});

test('rejects invalid checkout plans and school-plan purchases by non-admins', async () => {
  await assert.rejects(
    initializeFlutterwaveTransaction({
      user: { _id: userId, email: 'learner@example.test', role: 'student' },
      planKey: 'school_owner',
      billingCycle: 'monthly',
    }),
    { status: 403 },
  );
  await assert.rejects(
    initializeFlutterwaveTransaction({
      user: { _id: userId, email: 'learner@example.test', role: 'teacher' },
      planKey: 'unknown',
      billingCycle: 'monthly',
    }),
    { status: 400 },
  );
  await assert.rejects(
    initializeFlutterwaveTransaction({
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
    status: 'successful',
    tx_ref: 'flutterwave_test_reference',
    currency: 'NGN',
    amount: 50000,
    meta: { userId, plan: 'school_pro', billingCycle: 'termly' },
  };

  try {
    assert.equal((await activateFromTransaction({ ...transaction, status: 'failed' })).status, 'rejected');
    assert.equal((await activateFromTransaction({ ...transaction, amount: 500000 })).status, 'rejected');

    const firstActivation = await activateFromTransaction(transaction);
    assert.equal(firstActivation.status, 'activated');
    assert.equal(user.subscriptionTier, 'school_pro');
    assert.equal(user.maxTeachersAllowed, 13);
    assert.equal(updateQuery.paymentReferences.$ne, transaction.tx_ref);
    assert.deepEqual(updatePayload.$addToSet, { paymentReferences: transaction.tx_ref });

    const duplicateActivation = await activateFromTransaction(transaction);
    assert.equal(duplicateActivation.status, 'duplicate');
  } finally {
    User.findById = originalFindById;
    User.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('rejects transactions without a provider reference before updating an account', async () => {
  const result = await activateFromTransaction({
    status: 'successful',
    currency: 'NGN',
    amount: 200000,
    meta: { userId, plan: 'teacher_pro', billingCycle: 'monthly' },
  });
  assert.equal(result.status, 'rejected');
});

test('verifies transactions against Flutterwave using the provider transaction ID', async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.FLW_SECRET_KEY;
  let requestUrl;
  let requestOptions;
  process.env.FLW_SECRET_KEY = 'FLWSECK_TEST-not-a-real-key';
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return {
      ok: true,
      json: async () => ({
        status: 'success',
        data: { id: 12345, tx_ref: 'noted_test_reference', meta: { userId } },
      }),
    };
  };

  try {
    const transaction = await verifyFlutterwaveTransaction('12345');
    assert.equal(requestUrl, 'https://api.flutterwave.com/v3/transactions/12345/verify');
    assert.equal(requestOptions.method, undefined);
    assert.equal(transaction.reference, 'noted_test_reference');
    assert.equal(transaction.metadata.userId, userId);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.FLW_SECRET_KEY;
    else process.env.FLW_SECRET_KEY = originalSecret;
  }
});

test('validates Flutterwave webhook hashes using constant-time equality', () => {
  const secretHash = 'test-only-flutterwave-secret-hash';
  assert.equal(isValidFlutterwaveSignature(secretHash, secretHash), true);
  assert.equal(isValidFlutterwaveSignature(`${secretHash} `, secretHash), false);
  assert.equal(isValidFlutterwaveSignature('invalid', secretHash), false);
  assert.equal(isValidFlutterwaveSignature(secretHash, ''), false);
});
