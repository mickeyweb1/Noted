import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { KahootAttempt } from '../models/KahootAttempt.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { makeAccessCode, verifyHost } from '../sockets/kahoot.js';

test('Kahoot access-code generation creates unique individual codes', () => {
  const used = new Set();
  const codes = Array.from({ length: 5 }, () => makeAccessCode(used));

  assert.equal(codes.length, 5);
  assert.equal(new Set(codes).size, 5);
  assert.ok(codes.every((code) => /^K-[A-Z2-9]{8}$/.test(code)));
});

test('Kahoot attempts track submission recovery state', () => {
  const attempt = new KahootAttempt({
    quiz: '65b123456789012345678901',
    code: 'K-ABC23456',
    playerKey: 'player-1',
    studentName: 'Ada',
  });

  assert.equal(attempt.submissionSavedAt, null);
  assert.equal(attempt.submissionSaveAttempts, 0);
  assert.equal(attempt.submissionSaveError, '');
  assert.ok(KahootAttempt.schema.indexes().some(([fields]) =>
    fields.status === 1 &&
    fields.submissionSavedAt === 1 &&
    fields.completedAt === 1
  ));
});

test('Quiz submissions keep a unique quiz-and-code index for retries', () => {
  assert.ok(QuizSubmission.schema.indexes().some(([fields, options]) =>
    fields.quiz === 1 &&
    fields.accessCode === 1 &&
    options.unique === true
  ));
});

test('School admin may host an authorized teacher Kahoot', async () => {
  process.env.JWT_SECRET = 'kahoot-test-secret';
  const originalUserFindById = User.findById;
  const originalOrganizationFindOne = Organization.findOne;
  const adminId = '65b123456789012345678902';
  const teacherId = '65b123456789012345678903';
  const ownerId = '65b123456789012345678904';

  User.findById = (id) => ({
    select: async () => String(id) === adminId
      ? { _id: adminId, role: 'school_admin', isActive: true }
      : { _id: teacherId, role: 'teacher', schoolOwnerId: ownerId, hodId: null, schoolId: null },
  });
  Organization.findOne = () => ({
    select: async () => null,
  });

  const token = jwt.sign({ id: adminId }, process.env.JWT_SECRET);
  try {
    const allowed = await verifyHost(token, {
      createdBy: teacherId,
    });
    assert.equal(allowed, false);

    User.findById = (id) => ({
      select: async () => String(id) === adminId
        ? { _id: adminId, role: 'school_admin', isActive: true }
        : { _id: teacherId, role: 'teacher', schoolOwnerId: adminId, hodId: null, schoolId: null },
    });
    assert.equal(await verifyHost(token, { createdBy: teacherId }), true);
  } finally {
    User.findById = originalUserFindById;
    Organization.findOne = originalOrganizationFindOne;
  }
});
