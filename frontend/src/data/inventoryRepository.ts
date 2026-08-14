import type { InventoryRecord, ServerInventorySnapshot } from '../domain/inventory.ts'
import type { SyncStatus } from '../domain/task.ts'
import type { InventorySyncQueueItem } from '../sync/inventoryTypes.ts'

const DATABASE_NAME = 'remember-that'
const DATABASE_VERSION = 4
const INVENTORY_STORE = 'inventory'
const SYNC_STORE = 'inventorySyncQueue'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('tasks')) {
        const tasks = database.createObjectStore('tasks', { keyPath: 'id' })
        tasks.createIndex('archived', 'archived')
        tasks.createIndex('creatorId', 'creatorId')
      }
      if (!database.objectStoreNames.contains('taskSyncQueue')) {
        database.createObjectStore('taskSyncQueue', { keyPath: 'taskId' })
      }
      if (!database.objectStoreNames.contains(INVENTORY_STORE)) {
        const inventory = database.createObjectStore(INVENTORY_STORE, { keyPath: 'id' })
        inventory.createIndex('archived', 'archived')
        inventory.createIndex('creatorId', 'creatorId')
      }
      if (!database.objectStoreNames.contains(SYNC_STORE)) {
        database.createObjectStore(SYNC_STORE, { keyPath: 'inventoryId' })
      }
      if (!database.objectStoreNames.contains('attachments')) {
        const attachments = database.createObjectStore('attachments', { keyPath: 'id' })
        attachments.createIndex('parentRecordId', 'parentRecordId')
        attachments.createIndex('uploadedById', 'uploadedById')
      }
      if (!database.objectStoreNames.contains('attachmentSyncQueue')) database.createObjectStore('attachmentSyncQueue', { keyPath: 'attachmentId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local inventory storage.'))
    request.onblocked = () => reject(new Error('Local inventory storage is blocked by another app window.'))
  })
}

function result<T>(request: IDBRequest<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error(message))
  })
}

function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not update local inventory storage.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('The inventory storage update was cancelled.'))
  })
}

function normalize(record: InventoryRecord): InventoryRecord {
  return { ...record, syncError: record.syncError ?? null, conflictServerRecord: record.conflictServerRecord ?? null }
}

function fromServer(server: ServerInventorySnapshot, localVersion = 1): InventoryRecord {
  return {
    ...server,
    syncStatus: 'Synced',
    localVersion,
    lastSyncedAt: new Date().toISOString(),
    syncError: null,
    conflictServerRecord: null,
  }
}

export async function listInventory(): Promise<InventoryRecord[]> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(INVENTORY_STORE, 'readonly')
    const records = await result(transaction.objectStore(INVENTORY_STORE).getAll() as IDBRequest<InventoryRecord[]>, 'Could not load local inventory.')
    return records.map(normalize).sort((a, b) => b.deviceCreatedAt.localeCompare(a.deviceCreatedAt))
  } finally {
    database.close()
  }
}

export async function saveInventoryRecord(record: InventoryRecord): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([INVENTORY_STORE, SYNC_STORE], 'readwrite')
    const queuedRecord = { ...normalize(record), syncStatus: 'Waiting to Sync' as const, syncError: null }
    const queueItem: InventorySyncQueueItem = {
      inventoryId: record.id,
      operationId: crypto.randomUUID(),
      actingUserId: record.creatorId,
      action: 'upsert',
      record: queuedRecord,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
      blockedByConflict: false,
    }
    transaction.objectStore(INVENTORY_STORE).put(queuedRecord)
    transaction.objectStore(SYNC_STORE).put(queueItem)
    await finished(transaction)
  } finally {
    database.close()
  }
}

export async function listQueuedInventory(): Promise<InventorySyncQueueItem[]> {
  const database = await openDatabase()
  try {
    return await result(
      database.transaction(SYNC_STORE, 'readonly').objectStore(SYNC_STORE).getAll() as IDBRequest<InventorySyncQueueItem[]>,
      'Could not load the inventory synchronization queue.',
    )
  } finally {
    database.close()
  }
}

export async function setInventorySyncStatus(id: string, status: SyncStatus): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(INVENTORY_STORE, 'readwrite')
    const store = transaction.objectStore(INVENTORY_STORE)
    const record = await result(store.get(id) as IDBRequest<InventoryRecord | undefined>, 'Could not load the inventory record.')
    if (record) store.put({ ...normalize(record), syncStatus: status })
    await finished(transaction)
  } finally {
    database.close()
  }
}

export async function completeInventorySync(item: InventorySyncQueueItem, server: ServerInventorySnapshot): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([INVENTORY_STORE, SYNC_STORE], 'readwrite')
    const recordStore = transaction.objectStore(INVENTORY_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    const [current, queue] = await Promise.all([
      result(recordStore.get(item.inventoryId) as IDBRequest<InventoryRecord | undefined>, 'Could not load synced inventory.'),
      result(queueStore.get(item.inventoryId) as IDBRequest<InventorySyncQueueItem | undefined>, 'Could not load inventory sync operation.'),
    ])
    if (current && queue?.operationId === item.operationId) {
      recordStore.put(fromServer(server, current.localVersion))
      queueStore.delete(item.inventoryId)
    } else if (current && queue) {
      recordStore.put({ ...normalize(current), serverCreatedAt: server.serverCreatedAt, serverVersion: server.serverVersion })
      queueStore.put({ ...queue, record: { ...queue.record, serverCreatedAt: server.serverCreatedAt, serverVersion: server.serverVersion } })
    }
    await finished(transaction)
  } finally {
    database.close()
  }
}

export async function failInventorySync(item: InventorySyncQueueItem, message: string): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([INVENTORY_STORE, SYNC_STORE], 'readwrite')
    const recordStore = transaction.objectStore(INVENTORY_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    const [record, queue] = await Promise.all([
      result(recordStore.get(item.inventoryId) as IDBRequest<InventoryRecord | undefined>, 'Could not load failed inventory.'),
      result(queueStore.get(item.inventoryId) as IDBRequest<InventorySyncQueueItem | undefined>, 'Could not load inventory sync operation.'),
    ])
    if (queue?.operationId === item.operationId) {
      queueStore.put({ ...queue, attempts: queue.attempts + 1, lastAttemptAt: new Date().toISOString(), lastError: message })
      if (record) recordStore.put({ ...normalize(record), syncStatus: 'Sync Failed', syncError: message })
    }
    await finished(transaction)
  } finally {
    database.close()
  }
}

export async function markInventoryConflict(item: InventorySyncQueueItem, server: ServerInventorySnapshot): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([INVENTORY_STORE, SYNC_STORE], 'readwrite')
    const recordStore = transaction.objectStore(INVENTORY_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    const [record, queue] = await Promise.all([
      result(recordStore.get(item.inventoryId) as IDBRequest<InventoryRecord | undefined>, 'Could not load conflicting inventory.'),
      result(queueStore.get(item.inventoryId) as IDBRequest<InventorySyncQueueItem | undefined>, 'Could not load inventory conflict operation.'),
    ])
    if (record) recordStore.put({ ...normalize(record), syncStatus: 'Conflict Detected', syncError: 'Review the local and server versions.', conflictServerRecord: server, pendingPermanentDeletion: item.action === 'delete' ? false : record.pendingPermanentDeletion })
    if (queue?.operationId === item.operationId) queueStore.put({ ...queue, blockedByConflict: true, lastError: 'Conflict detected' })
    await finished(transaction)
  } finally {
    database.close()
  }
}

export async function mergeServerInventory(serverRecords: readonly ServerInventorySnapshot[]): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(INVENTORY_STORE, 'readwrite')
    const store = transaction.objectStore(INVENTORY_STORE)
    const locals = await result(store.getAll() as IDBRequest<InventoryRecord[]>, 'Could not load local inventory for merging.')
    const localById = new Map(locals.map((record) => [record.id, normalize(record)]))
    for (const server of serverRecords) {
      const local = localById.get(server.id)
      if (!local || local.syncStatus === 'Synced') store.put(fromServer(server, local?.localVersion ?? 1))
    }
    await finished(transaction)
  } finally {
    database.close()
  }
}
export async function queuePermanentInventoryDeletion(record: InventoryRecord): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([INVENTORY_STORE, SYNC_STORE], 'readwrite')
    const pendingRecord = { ...normalize(record), syncStatus: 'Waiting to Sync' as const, pendingPermanentDeletion: true }
    const queueItem: InventorySyncQueueItem = {
      inventoryId: record.id,
      operationId: crypto.randomUUID(),
      actingUserId: record.creatorId,
      action: 'delete',
      record: pendingRecord,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
      blockedByConflict: false,
    }
    transaction.objectStore(INVENTORY_STORE).put(pendingRecord)
    transaction.objectStore(SYNC_STORE).put(queueItem)
    await finished(transaction)
  } finally {
    database.close()
  }
}

export async function completePermanentInventoryDeletion(item: InventorySyncQueueItem): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([INVENTORY_STORE, SYNC_STORE], 'readwrite')
    const queueStore = transaction.objectStore(SYNC_STORE)
    const queue = await result(queueStore.get(item.inventoryId) as IDBRequest<InventorySyncQueueItem | undefined>, 'Could not load the inventory deletion operation.')
    if (queue?.operationId === item.operationId) {
      transaction.objectStore(INVENTORY_STORE).delete(item.inventoryId)
      queueStore.delete(item.inventoryId)
    }
    await finished(transaction)
  } finally {
    database.close()
  }
}

export async function applyServerInventoryDeletions(inventoryIds: readonly string[]): Promise<void> {
  if (inventoryIds.length === 0) return
  const database = await openDatabase()
  try {
    const transaction = database.transaction([INVENTORY_STORE, SYNC_STORE], 'readwrite')
    const recordStore = transaction.objectStore(INVENTORY_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    for (const inventoryId of inventoryIds) {
      recordStore.delete(inventoryId)
      queueStore.delete(inventoryId)
    }
    await finished(transaction)
  } finally {
    database.close()
  }
}
