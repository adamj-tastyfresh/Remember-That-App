import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPermanentDeletionAllowed, hasDeletionVersionConflict, parseRecordDeletionRequest } from './recordDeletion.ts';

const request = {
  operationId: '123e4567-e89b-42d3-a456-426614174020',
  actingUserId: 'usr-adam',
  recordId: '123e4567-e89b-42d3-a456-426614174021',
  creatorId: 'usr-adam',
  baseServerVersion: 2,
};

test('parses a valid permanent deletion request', () => {
  assert.equal(parseRecordDeletionRequest(request).baseServerVersion, 2);
});

test('requires creator ownership and an archived server record', () => {
  const parsed = parseRecordDeletionRequest(request);
  assert.doesNotThrow(() => assertPermanentDeletionAllowed(parsed, { creatorId: 'usr-adam', archived: true, serverVersion: 2 }));
  assert.throws(() => assertPermanentDeletionAllowed({ ...parsed, actingUserId: 'usr-mary' }, { creatorId: 'usr-adam', archived: true, serverVersion: 2 }), /creator/);
  assert.throws(() => assertPermanentDeletionAllowed(parsed, { creatorId: 'usr-adam', archived: false, serverVersion: 2 }), /archived/);
});

test('allows deletion of an offline-only record with no server version', () => {
  const parsed = parseRecordDeletionRequest({ ...request, baseServerVersion: null });
  assert.doesNotThrow(() => assertPermanentDeletionAllowed(parsed, null));
});

test('detects a stale deletion version', () => {
  const parsed = parseRecordDeletionRequest(request);
  assert.equal(hasDeletionVersionConflict(parsed, 2), false);
  assert.equal(hasDeletionVersionConflict(parsed, 3), true);
});
