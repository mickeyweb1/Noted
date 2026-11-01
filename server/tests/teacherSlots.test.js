import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { SCHOOL_PLAN_TIERS } from '../config/plans.js';
import { registerUser } from '../controllers/authController.js';
import { addTeacher } from '../controllers/adminController.js';

const ownerId = '65b123456789012345678902';

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('school Pro and Premium plans can reserve a teacher slot during invite-code registration', async () => {
  const originals = {
    userExists: User.exists,
    findOneAndUpdate: User.findOneAndUpdate,
    userCreate: User.create,
    organizationFindOne: Organization.findOne,
  };
  const originalJwtSecret = process.env.JWT_SECRET;
  let slotQuery;
  User.exists = async () => null;
  User.findOneAndUpdate = async (query) => {
    slotQuery = query;
    return { _id: ownerId };
  };
  User.create = async (user) => ({ ...user, _id: '65b123456789012345678904' });
  Organization.findOne = async () => ({
    _id: '65b123456789012345678903',
    adminId: ownerId,
    name: 'North School',
  });
  process.env.JWT_SECRET = 'test-only-jwt-secret';
  const response = makeResponse();

  try {
    await registerUser({
      body: {
        fullName: 'Teacher Example',
        email: 'teacher@example.test',
        password: 'test-password',
        role: 'teacher',
        inviteCode: 'SCHOOL-CODE',
      },
    }, response, (error) => {
      throw error;
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(slotQuery.subscriptionTier, { $in: SCHOOL_PLAN_TIERS });
    assert.ok(slotQuery.subscriptionTier.$in.includes('school_pro'));
    assert.ok(slotQuery.subscriptionTier.$in.includes('school_premium'));
    assert.equal(slotQuery.subscriptionStatus, 'active');
    assert.ok(slotQuery.$or.some((condition) => condition.subscriptionEndsAt?.$gt instanceof Date));
    assert.equal(slotQuery.$expr.$lt[0], '$currentTeachersCount');
    assert.equal(slotQuery.$expr.$lt[1], '$maxTeachersAllowed');
  } finally {
    User.exists = originals.userExists;
    User.findOneAndUpdate = originals.findOneAndUpdate;
    User.create = originals.userCreate;
    Organization.findOne = originals.organizationFindOne;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('school admins must have an active plan and an available slot when adding a teacher in production', async () => {
  const originals = {
    userExists: User.exists,
    findOneAndUpdate: User.findOneAndUpdate,
    userCreate: User.create,
    userFindOne: User.findOne,
    organizationFindOne: Organization.findOne,
  };
  const originalNodeEnv = process.env.NODE_ENV;
  let slotQuery;
  User.exists = async () => null;
  User.findOneAndUpdate = async (query) => {
    slotQuery = query;
    return { _id: ownerId };
  };
  User.create = async (user) => ({ ...user, _id: '65b123456789012345678904' });
  User.findOne = async () => null;
  Organization.findOne = async () => ({
    _id: '65b123456789012345678903',
    adminId: ownerId,
    name: 'North School',
  });
  process.env.NODE_ENV = 'production';
  const response = makeResponse();

  try {
    await addTeacher({
      user: { _id: ownerId, role: 'school_admin', schoolName: 'North School' },
      body: { fullName: 'Teacher Example', email: 'teacher@example.test' },
    }, response, (error) => {
      throw error;
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(slotQuery.subscriptionTier, { $in: SCHOOL_PLAN_TIERS });
    assert.equal(slotQuery.subscriptionStatus, 'active');
    assert.ok(slotQuery.$or.some((condition) => condition.subscriptionEndsAt?.$gt instanceof Date));
    assert.equal(slotQuery.$expr.$lt[0], '$currentTeachersCount');
    assert.equal(slotQuery.$expr.$lt[1], '$maxTeachersAllowed');
  } finally {
    User.exists = originals.userExists;
    User.findOneAndUpdate = originals.findOneAndUpdate;
    User.create = originals.userCreate;
    User.findOne = originals.userFindOne;
    Organization.findOne = originals.organizationFindOne;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});
