import assert from 'node:assert/strict'
import test from 'node:test'
import type { User } from '../data/users.ts'
import { archiveInventoryRecord, createInventoryRecord, hasUnsynchronisedInventory, prepareInventoryPermanentDeletion, updateInventoryRecord } from './inventory.ts'

const adam: User = { id: 'usr-adam', name: 'Adam' }
const mary: User = { id: 'usr-mary', name: 'Mary' }
const createdAt = '2026-08-14T01:00:00.000Z'

test('creates a minimal inventory record with immutable ownership', () => {
  const record = createInventoryRecord({ itemName: '  Spare switch ', itemLocation: ' IT cupboard  ' }, adam, 'inventory-1', createdAt)
  assert.equal(record.itemName, 'Spare switch')
  assert.equal(record.itemLocation, 'IT cupboard')
  assert.equal(record.creatorId, adam.id)
  assert.equal(record.syncStatus, 'Waiting to Sync')
})

test('allows only the creator to edit inventory', () => {
  const record = createInventoryRecord({ itemName: 'Switch', itemLocation: 'Cupboard' }, adam, 'inventory-2', createdAt)
  const updated = updateInventoryRecord(record, { itemName: 'Switch', itemLocation: 'Shelf two' }, adam)
  assert.equal(updated.itemLocation, 'Shelf two')
  assert.equal(updated.creatorId, adam.id)
  assert.throws(() => updateInventoryRecord(record, { itemName: 'Switch', itemLocation: 'Elsewhere' }, mary), /Only the person/)
})

test('allows only the creator to archive inventory', () => {
  const record = createInventoryRecord({ itemName: 'Switch', itemLocation: 'Cupboard' }, adam, 'inventory-3', createdAt)
  assert.equal(archiveInventoryRecord(record, adam).archived, true)
  assert.throws(() => archiveInventoryRecord(record, mary), /Only the person/)
})

test('detects unsynchronised inventory for the selected user', () => {
  const record = createInventoryRecord({ itemName: 'Switch', itemLocation: 'Cupboard' }, adam, 'inventory-4', createdAt)
  assert.equal(hasUnsynchronisedInventory([record], adam.id), true)
  assert.equal(hasUnsynchronisedInventory([record], mary.id), false)
})

test('allows only the creator to permanently delete archived inventory', () => {
  const record = createInventoryRecord({ itemName: 'Delete me', itemLocation: 'Old shelf' }, adam, 'inventory-5', createdAt)
  const archived = archiveInventoryRecord(record, adam)
  assert.equal(prepareInventoryPermanentDeletion(archived, adam).pendingPermanentDeletion, true)
  assert.throws(() => prepareInventoryPermanentDeletion(record, adam), /Only archived inventory/)
  assert.throws(() => prepareInventoryPermanentDeletion(archived, mary), /Only the person/)
})
