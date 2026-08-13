import assert from 'node:assert/strict';
import test from 'node:test';
import { assertTaskSyncAllowed, hasTaskVersionConflict, parseTaskSyncRequest } from './taskSync.ts';

const validRequest = {
  operationId: '123e4567-e89b-42d3-a456-426614174000',
  actingUserId: 'usr-adam',
  task: {
    id: '123e4567-e89b-42d3-a456-426614174001',
    title: 'Replace switch',
    description: 'Stored in the IT cupboard.',
    creatorId: 'usr-adam',
    deviceCreatedAt: '2026-08-13T01:00:00.000Z',
    lastModifiedAt: '2026-08-13T01:00:00.000Z',
    archived: false,
    archivedAt: null,
    archivedBy: null,
    baseServerVersion: null,
  },
};

test('accepts a valid new-task sync request', () => {
  const parsed = parseTaskSyncRequest(validRequest);
  assert.equal(parsed.operationId, validRequest.operationId);
  assert.equal(parsed.task.title, 'Replace switch');
  assert.equal(parsed.task.baseServerVersion, null);
});

test('rejects invalid operation and task IDs', () => {
  assert.throws(
    () => parseTaskSyncRequest({ ...validRequest, operationId: 'not-a-uuid' }),
    /must be UUIDs/,
  );
});

test('rejects empty and oversized task titles', () => {
  assert.throws(
    () => parseTaskSyncRequest({ ...validRequest, task: { ...validRequest.task, title: ' ' } }),
    /title is required/,
  );
  assert.throws(
    () => parseTaskSyncRequest({ ...validRequest, task: { ...validRequest.task, title: 'x'.repeat(251) } }),
    /250 characters/,
  );
});

test('requires a valid base server version for updates', () => {
  assert.throws(
    () => parseTaskSyncRequest({ ...validRequest, task: { ...validRequest.task, baseServerVersion: 0 } }),
    /positive integer/,
  );
  assert.equal(
    parseTaskSyncRequest({ ...validRequest, task: { ...validRequest.task, baseServerVersion: 3 } }).task.baseServerVersion,
    3,
  );
});
test('enforces task ownership independently of the frontend', () => {
  const parsed = parseTaskSyncRequest(validRequest);
  assert.doesNotThrow(() => assertTaskSyncAllowed(parsed, null));
  assert.throws(
    () => assertTaskSyncAllowed({ ...parsed, actingUserId: 'usr-mary' }, null),
    /must belong to the selected user/,
  );
  assert.throws(
    () => assertTaskSyncAllowed(parsed, { creatorId: 'usr-mary', serverVersion: 1 }),
    /Only the task creator/,
  );
});

test('requires the creator to be recorded as the archiving user', () => {
  const parsed = parseTaskSyncRequest({
    ...validRequest,
    task: { ...validRequest.task, archived: true, archivedAt: '2026-08-13T02:00:00.000Z', archivedBy: 'usr-mary' },
  });
  assert.throws(() => assertTaskSyncAllowed(parsed, null), /archived by their creator/);
});
test('detects stale server versions without overwriting either version', () => {
  const current = parseTaskSyncRequest({
    ...validRequest,
    task: { ...validRequest.task, baseServerVersion: 3 },
  });
  assert.equal(hasTaskVersionConflict(current, 3), false);
  assert.equal(hasTaskVersionConflict(current, 4), true);
});