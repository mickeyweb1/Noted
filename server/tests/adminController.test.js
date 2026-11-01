import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { createOrganization } from '../controllers/adminController.js';

const adminId = '65b123456789012345678901';

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

test('organization creation rejects an empty or oversized school name', async () => {
  const originalFindOne = Organization.findOne;
  let lookupCalled = false;
  Organization.findOne = async () => {
    lookupCalled = true;
    return null;
  };

  try {
    for (const name of ['', '   ', 'x'.repeat(121)]) {
      let receivedError;
      await createOrganization(
        { body: { name }, user: { _id: adminId } },
        makeResponse(),
        (error) => { receivedError = error; },
      );
      assert.equal(receivedError.status, 400);
    }
    assert.equal(lookupCalled, false);
  } finally {
    Organization.findOne = originalFindOne;
  }
});

test('organization creation prevents an admin from creating a second organization', async () => {
  const originalFindOne = Organization.findOne;
  const originalCreate = Organization.create;
  let createCalled = false;
  Organization.findOne = async () => ({ _id: '65b123456789012345678902' });
  Organization.create = async () => {
    createCalled = true;
  };
  const response = makeResponse();
  let receivedError;

  try {
    await createOrganization(
      { body: { name: 'Another School' }, user: { _id: adminId } },
      response,
      (error) => { receivedError = error; },
    );

    assert.equal(receivedError.status, 409);
    assert.equal(createCalled, false);
  } finally {
    Organization.findOne = originalFindOne;
    Organization.create = originalCreate;
  }
});

test('organization creation trims the name before storing and updating the admin', async () => {
  const originalFindOne = Organization.findOne;
  const originalCreate = Organization.create;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  let createdData;
  let userUpdate;
  Organization.findOne = async (query) => query.adminId
    ? null
    : null;
  Organization.create = async (data) => {
    createdData = data;
    return { ...data, _id: '65b123456789012345678902' };
  };
  User.findByIdAndUpdate = async (id, update) => {
    userUpdate = { id, update };
  };
  const response = makeResponse();

  try {
    await createOrganization(
      { body: { name: '  North School  ' }, user: { _id: adminId } },
      response,
      (error) => { throw error; },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(createdData.name, 'North School');
    assert.equal(userUpdate.id, adminId);
    assert.equal(userUpdate.update.schoolName, 'North School');
    assert.equal(String(userUpdate.update.schoolId), '65b123456789012345678902');
  } finally {
    Organization.findOne = originalFindOne;
    Organization.create = originalCreate;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});
