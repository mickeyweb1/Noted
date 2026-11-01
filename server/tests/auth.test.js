import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { loginUser, registerUser } from '../controllers/authController.js';

const userId = '65b123456789012345678901';
const schoolOwnerId = '65b123456789012345678902';

test('school student registration links the student to the school owner account', async () => {
  const originalExists = User.exists;
  const originalCreate = User.create;
  const originalFindOne = Organization.findOne;
  const originalJwtSecret = process.env.JWT_SECRET;
  let createdUser;
  User.exists = async () => null;
  User.create = async (userData) => {
    createdUser = userData;
    return { ...userData, _id: userId };
  };
  Organization.findOne = async () => ({
    _id: '65b123456789012345678903',
    adminId: schoolOwnerId,
    name: 'North School',
  });
  process.env.JWT_SECRET = 'test-only-jwt-secret';

  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await registerUser({
      body: {
        fullName: 'Student Example',
        email: 'student@example.test',
        password: 'test-password',
        role: 'student',
        inviteCode: 'SCHOOL-CODE',
      },
    }, response, (error) => {
      throw error;
    });

    assert.equal(response.statusCode, 201);
    assert.equal(String(createdUser.schoolId), '65b123456789012345678903');
    assert.equal(String(createdUser.schoolOwnerId), schoolOwnerId);
    assert.equal(String(response.body.user.schoolOwnerId), schoolOwnerId);
  } finally {
    User.exists = originalExists;
    User.create = originalCreate;
    Organization.findOne = originalFindOne;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('login normalizes email and rejects an incorrect password', async () => {
  const originalFindOne = User.findOne;
  const originalJwtSecret = process.env.JWT_SECRET;
  const account = {
    _id: userId,
    fullName: 'Student Example',
    email: 'student@example.test',
    role: 'student',
    password: await bcrypt.hash('correct-password', 4),
    isActive: true,
  };
  let queriedEmail;
  User.findOne = (query) => {
    queriedEmail = query.email;
    return { select: async () => account };
  };
  process.env.JWT_SECRET = 'test-only-jwt-secret';

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

  try {
    const successResponse = makeResponse();
    await loginUser({
      body: { email: '  STUDENT@EXAMPLE.TEST ', password: 'correct-password' },
    }, successResponse, (error) => {
      throw error;
    });

    assert.equal(queriedEmail, 'student@example.test');
    assert.equal(successResponse.statusCode, 200);
    assert.equal(successResponse.body.user.email, 'student@example.test');
    assert.equal(typeof successResponse.body.token, 'string');

    const failureResponse = makeResponse();
    await loginUser({
      body: { email: 'student@example.test', password: 'incorrect-password' },
    }, failureResponse, (error) => {
      throw error;
    });
    assert.equal(failureResponse.statusCode, 401);
    assert.equal(failureResponse.body.message, 'Invalid email or password');
  } finally {
    User.findOne = originalFindOne;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});
