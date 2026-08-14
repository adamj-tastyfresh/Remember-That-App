import assert from 'node:assert/strict'
import test from 'node:test'
import type { InventoryRecord } from './inventory.ts'
import { searchActiveRecords } from './search.ts'
import type { TaskRecord } from './task.ts'

const task: TaskRecord = {
  id: 'task-1', title: 'Update FileMaker server', description: 'Applied the latest patch',
  creatorId: 'usr-adam', creatorName: 'Adam', deviceCreatedAt: '2026-08-14T01:00:00.000Z',
  serverCreatedAt: null, lastModifiedAt: '2026-08-14T01:00:00.000Z', archived: false,
  archivedAt: null, archivedBy: null, syncStatus: 'Synced', localVersion: 1,
  serverVersion: 1, lastSyncedAt: '2026-08-14T01:10:00.000Z', syncError: null,
  conflictServerTask: null,
}

const inventory: InventoryRecord = {
  id: 'inventory-1', itemName: 'iPhone Charger', itemLocation: 'IT cupboard',
  creatorId: 'usr-mary', creatorName: 'Mary', deviceCreatedAt: '2026-08-13T01:00:00.000Z',
  serverCreatedAt: null, lastModifiedAt: '2026-08-13T01:00:00.000Z', archived: false,
  archivedAt: null, archivedBy: null, syncStatus: 'Synced', localVersion: 1,
  serverVersion: 1, lastSyncedAt: '2026-08-13T01:10:00.000Z', syncError: null,
  conflictServerRecord: null,
}

test('matches partial words across active tasks and inventory', () => {
  assert.deepEqual(searchActiveRecords([task], [inventory], 'file').map((result) => result.type), ['task'])
  assert.deepEqual(searchActiveRecords([task], [inventory], 'charg').map((result) => result.type), ['inventory'])
})

test('matches case-insensitively across content, location, and creator', () => {
  assert.equal(searchActiveRecords([task], [inventory], 'LATEST').length, 1)
  assert.equal(searchActiveRecords([task], [inventory], 'cupBOARD').length, 1)
  assert.equal(searchActiveRecords([task], [inventory], 'mary').length, 1)
})

test('excludes archived records from normal search', () => {
  assert.equal(searchActiveRecords([{ ...task, archived: true }], [{ ...inventory, archived: true }], 'a').length, 0)
})

test('does not return every record for a blank query', () => {
  assert.deepEqual(searchActiveRecords([task], [inventory], '   '), [])
})


test('excludes records waiting for permanent deletion', () => {
  assert.equal(searchActiveRecords([{ ...task, pendingPermanentDeletion: true }], [{ ...inventory, pendingPermanentDeletion: true }], 'a').length, 0)
})
