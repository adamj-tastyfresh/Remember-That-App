import assert from 'node:assert/strict';
import test from 'node:test';
import { assertInventorySyncAllowed, hasInventoryVersionConflict, parseInventorySyncRequest } from './inventorySync.ts';

const validRequest = {
  operationId: '123e4567-e89b-42d3-a456-426614174010',
  actingUserId: 'usr-adam',
  inventory: {
    id: '123e4567-e89b-42d3-a456-426614174011',
    itemName: 'Spare switch',
    itemLocation: 'IT cupboard',
    creatorId: 'usr-adam',
    deviceCreatedAt: '2026-08-14T01:00:00.000Z',
    lastModifiedAt: '2026-08-14T01:00:00.000Z',
    archived: false,
    archivedAt: null,
    archivedBy: null,
    baseServerVersion: null,
  },
};

test('accepts valid inventory sync data', () => {
  const parsed = parseInventorySyncRequest(validRequest);
  assert.equal(parsed.inventory.itemName, 'Spare switch');
  assert.doesNotThrow(() => assertInventorySyncAllowed(parsed, null));
});

test('validates inventory field limits', () => {
  assert.throws(() => parseInventorySyncRequest({ ...validRequest, inventory: { ...validRequest.inventory, itemName: 'x'.repeat(251) } }), /250 characters/);
  assert.throws(() => parseInventorySyncRequest({ ...validRequest, inventory: { ...validRequest.inventory, itemLocation: 'x'.repeat(501) } }), /500 characters/);
});

test('enforces inventory ownership independently of the frontend', () => {
  const parsed = parseInventorySyncRequest(validRequest);
  assert.throws(() => assertInventorySyncAllowed({ ...parsed, actingUserId: 'usr-mary' }, null), /selected user/);
  assert.throws(() => assertInventorySyncAllowed(parsed, { creatorId: 'usr-mary', serverVersion: 1 }), /Only the inventory creator/);
});

test('detects stale inventory versions', () => {
  const parsed = parseInventorySyncRequest({ ...validRequest, inventory: { ...validRequest.inventory, baseServerVersion: 2 } });
  assert.equal(hasInventoryVersionConflict(parsed, 2), false);
  assert.equal(hasInventoryVersionConflict(parsed, 3), true);
});