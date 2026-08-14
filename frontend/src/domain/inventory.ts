import type { User } from '../data/users.ts'
import type { SyncStatus } from './task.ts'

export type ServerInventorySnapshot = {
  id: string
  itemName: string
  itemLocation: string
  creatorId: string
  creatorName: string
  deviceCreatedAt: string
  serverCreatedAt: string
  lastModifiedAt: string
  archived: boolean
  archivedAt: string | null
  archivedBy: string | null
  serverVersion: number
}

export type InventoryRecord = {
  id: string
  itemName: string
  itemLocation: string
  creatorId: string
  creatorName: string
  deviceCreatedAt: string
  serverCreatedAt: string | null
  lastModifiedAt: string
  archived: boolean
  archivedAt: string | null
  archivedBy: string | null
  syncStatus: SyncStatus
  localVersion: number
  serverVersion: number | null
  lastSyncedAt: string | null
  syncError: string | null
  conflictServerRecord: ServerInventorySnapshot | null
  pendingPermanentDeletion?: boolean
}

export type InventoryInput = {
  itemName: string
  itemLocation: string
}

function validateInventoryInput(input: InventoryInput): InventoryInput {
  const itemName = input.itemName.trim()
  const itemLocation = input.itemLocation.trim()
  if (!itemName) throw new Error('Enter an item name.')
  if (itemName.length > 250) throw new Error('Item names must be 250 characters or fewer.')
  if (!itemLocation) throw new Error('Enter an item location.')
  if (itemLocation.length > 500) throw new Error('Item locations must be 500 characters or fewer.')
  return { itemName, itemLocation }
}

export function createInventoryRecord(
  input: InventoryInput,
  user: User,
  id: string = crypto.randomUUID(),
  now = new Date().toISOString(),
): InventoryRecord {
  return {
    id,
    ...validateInventoryInput(input),
    creatorId: user.id,
    creatorName: user.name,
    deviceCreatedAt: now,
    serverCreatedAt: null,
    lastModifiedAt: now,
    archived: false,
    archivedAt: null,
    archivedBy: null,
    syncStatus: 'Waiting to Sync',
    localVersion: 1,
    serverVersion: null,
    lastSyncedAt: null,
    syncError: null,
    conflictServerRecord: null,
  }
}

export function updateInventoryRecord(
  record: InventoryRecord,
  input: InventoryInput,
  user: User,
  now = new Date().toISOString(),
): InventoryRecord {
  if (record.creatorId !== user.id) throw new Error('Only the person who created this inventory record can edit it.')
  return {
    ...record,
    ...validateInventoryInput(input),
    lastModifiedAt: now,
    syncStatus: 'Waiting to Sync',
    syncError: null,
    localVersion: record.localVersion + 1,
  }
}

export function archiveInventoryRecord(
  record: InventoryRecord,
  user: User,
  now = new Date().toISOString(),
): InventoryRecord {
  if (record.creatorId !== user.id) throw new Error('Only the person who created this inventory record can archive it.')
  return {
    ...record,
    archived: true,
    archivedAt: now,
    archivedBy: user.id,
    lastModifiedAt: now,
    syncStatus: 'Waiting to Sync',
    syncError: null,
    localVersion: record.localVersion + 1,
  }
}

export function hasUnsynchronisedInventory(records: readonly InventoryRecord[], userId: string): boolean {
  return records.some((record) => record.creatorId === userId && record.syncStatus !== 'Synced')
}
export function prepareInventoryPermanentDeletion(record: InventoryRecord, user: User): InventoryRecord {
  if (!record.archived) throw new Error('Only archived inventory can be permanently deleted.')
  if (record.creatorId !== user.id) throw new Error('Only the person who created this inventory record can permanently delete it.')
  return { ...record, syncStatus: 'Waiting to Sync', syncError: null, pendingPermanentDeletion: true }
}
