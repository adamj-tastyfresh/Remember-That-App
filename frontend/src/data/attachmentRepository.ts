import type { LocalAttachmentRecord, ServerAttachmentMetadata } from '../domain/attachment.ts'
import type { AttachmentSyncQueueItem } from '../sync/attachmentTypes.ts'

const DATABASE_NAME = 'remember-that'
const DATABASE_VERSION = 4
const ATTACHMENT_STORE = 'attachments'
const SYNC_STORE = 'attachmentSyncQueue'

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
      if (!database.objectStoreNames.contains('taskSyncQueue')) database.createObjectStore('taskSyncQueue', { keyPath: 'taskId' })
      if (!database.objectStoreNames.contains('inventory')) {
        const inventory = database.createObjectStore('inventory', { keyPath: 'id' })
        inventory.createIndex('archived', 'archived')
        inventory.createIndex('creatorId', 'creatorId')
      }
      if (!database.objectStoreNames.contains('inventorySyncQueue')) database.createObjectStore('inventorySyncQueue', { keyPath: 'inventoryId' })
      if (!database.objectStoreNames.contains(ATTACHMENT_STORE)) {
        const attachments = database.createObjectStore(ATTACHMENT_STORE, { keyPath: 'id' })
        attachments.createIndex('parentRecordId', 'parentRecordId')
        attachments.createIndex('uploadedById', 'uploadedById')
      }
      if (!database.objectStoreNames.contains(SYNC_STORE)) database.createObjectStore(SYNC_STORE, { keyPath: 'attachmentId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local attachment storage.'))
    request.onblocked = () => reject(new Error('Local attachment storage is blocked by another app window.'))
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
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not update local attachment storage.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('The attachment storage update was cancelled.'))
  })
}

export async function listAttachments(): Promise<LocalAttachmentRecord[]> {
  const database = await openDatabase()
  try {
    const records = await result(database.transaction(ATTACHMENT_STORE, 'readonly').objectStore(ATTACHMENT_STORE).getAll() as IDBRequest<LocalAttachmentRecord[]>, 'Could not load local attachments.')
    return records.sort((left, right) => right.deviceCreatedAt.localeCompare(left.deviceCreatedAt))
  } finally {
    database.close()
  }
}

export async function saveLocalAttachment(attachment: LocalAttachmentRecord): Promise<void> {
  await saveLocalAttachments([attachment])
}

export async function saveLocalAttachments(attachments: readonly LocalAttachmentRecord[]): Promise<void> {
  if (attachments.length === 0) return
  const database = await openDatabase()
  try {
    const transaction = database.transaction([ATTACHMENT_STORE, SYNC_STORE], 'readwrite')
    const attachmentStore = transaction.objectStore(ATTACHMENT_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    for (const attachment of attachments) {
      const queueItem: AttachmentSyncQueueItem = {
        attachmentId: attachment.id,
        operationId: crypto.randomUUID(),
        actingUserId: attachment.uploadedById,
        attachment,
        createdAt: new Date().toISOString(),
        attempts: 0,
        lastAttemptAt: null,
        lastError: null,
      }
      attachmentStore.put(attachment)
      queueStore.put(queueItem)
    }
    await finished(transaction)
  } finally {
    database.close()
  }
}

export async function listQueuedAttachments(): Promise<AttachmentSyncQueueItem[]> {
  const database = await openDatabase()
  try {
    return await result(database.transaction(SYNC_STORE, 'readonly').objectStore(SYNC_STORE).getAll() as IDBRequest<AttachmentSyncQueueItem[]>, 'Could not load the attachment upload queue.')
  } finally {
    database.close()
  }
}

export async function deleteLocalAttachmentsForParents(parentRecordIds: readonly string[]): Promise<void> {
  if (parentRecordIds.length === 0) return
  const targets = new Set(parentRecordIds)
  const database = await openDatabase()
  try {
    const transaction = database.transaction([ATTACHMENT_STORE, SYNC_STORE], 'readwrite')
    const attachmentStore = transaction.objectStore(ATTACHMENT_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    const attachments = await result(attachmentStore.getAll() as IDBRequest<LocalAttachmentRecord[]>, 'Could not load attachments for deletion.')
    for (const attachment of attachments) {
      if (targets.has(attachment.parentRecordId)) {
        attachmentStore.delete(attachment.id)
        queueStore.delete(attachment.id)
      }
    }
    await finished(transaction)
  } finally {
    database.close()
  }
}
export async function mergeServerAttachmentMetadata(serverRecords: readonly ServerAttachmentMetadata[]): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(ATTACHMENT_STORE, 'readwrite')
    const store = transaction.objectStore(ATTACHMENT_STORE)
    const localRecords = await result(store.getAll() as IDBRequest<LocalAttachmentRecord[]>, 'Could not load local attachments for merging.')
    const localById = new Map(localRecords.map((record) => [record.id, record]))
    for (const server of serverRecords) {
      const local = localById.get(server.id)
      if (!local || local.syncStatus === 'Synced') {
        store.put({ ...server, syncStatus: 'Synced', syncError: null, localBlob: local?.localBlob ?? null } satisfies LocalAttachmentRecord)
      }
    }
    await finished(transaction)
  } finally {
    database.close()
  }
}
