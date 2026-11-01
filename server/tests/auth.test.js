import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { registerUser } from '../controllers/authController.js';

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
