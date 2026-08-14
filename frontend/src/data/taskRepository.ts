import type { ServerTaskSnapshot, SyncStatus, TaskRecord } from '../domain/task.ts'
import type { SyncQueueItem } from '../sync/types.ts'

const DATABASE_NAME = 'remember-that'
const DATABASE_VERSION = 4
const TASK_STORE = 'tasks'
const SYNC_STORE = 'taskSyncQueue'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(TASK_STORE)) {
        const store = database.createObjectStore(TASK_STORE, { keyPath: 'id' })
        store.createIndex('archived', 'archived')
        store.createIndex('creatorId', 'creatorId')
      }
      if (!database.objectStoreNames.contains(SYNC_STORE)) {
        database.createObjectStore(SYNC_STORE, { keyPath: 'taskId' })
      }
      if (!database.objectStoreNames.contains('inventory')) {
        const inventory = database.createObjectStore('inventory', { keyPath: 'id' })
        inventory.createIndex('archived', 'archived')
        inventory.createIndex('creatorId', 'creatorId')
      }
      if (!database.objectStoreNames.contains('inventorySyncQueue')) {
        database.createObjectStore('inventorySyncQueue', { keyPath: 'inventoryId' })
      }
      if (!database.objectStoreNames.contains('attachments')) {
        const attachments = database.createObjectStore('attachments', { keyPath: 'id' })
        attachments.createIndex('parentRecordId', 'parentRecordId')
        attachments.createIndex('uploadedById', 'uploadedById')
      }
      if (!database.objectStoreNames.contains('attachmentSyncQueue')) database.createObjectStore('attachmentSyncQueue', { keyPath: 'attachmentId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local task storage.'))
    request.onblocked = () => reject(new Error('Local task storage is blocked by another app window.'))
  })
}

function requestResult<T>(request: IDBRequest<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error(message))
  })
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not update local task storage.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('The local storage update was cancelled.'))
  })
}

function normalizeTask(task: TaskRecord): TaskRecord {
  return { ...task, syncError: task.syncError ?? null, conflictServerTask: task.conflictServerTask ?? null }
}

function fromServer(serverTask: ServerTaskSnapshot, localVersion = 1): TaskRecord {
  return {
    ...serverTask,
    syncStatus: 'Synced',
    localVersion,
    lastSyncedAt: new Date().toISOString(),
    syncError: null,
    conflictServerTask: null,
  }
}

export async function listTasks(): Promise<TaskRecord[]> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(TASK_STORE, 'readonly')
    const tasks = await requestResult(
      transaction.objectStore(TASK_STORE).getAll() as IDBRequest<TaskRecord[]>,
      'Could not load local tasks.',
    )
    return tasks.map(normalizeTask).sort((first, second) => second.deviceCreatedAt.localeCompare(first.deviceCreatedAt))
  } finally {
    database.close()
  }
}

export async function saveTask(task: TaskRecord): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([TASK_STORE, SYNC_STORE], 'readwrite')
    const queuedTask = { ...normalizeTask(task), syncStatus: 'Waiting to Sync' as const, syncError: null }
    const queueItem: SyncQueueItem = {
      taskId: task.id,
      operationId: crypto.randomUUID(),
      actingUserId: task.creatorId,
      action: 'upsert',
      task: queuedTask,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
      blockedByConflict: false,
    }
    transaction.objectStore(TASK_STORE).put(queuedTask)
    transaction.objectStore(SYNC_STORE).put(queueItem)
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function listQueuedTasks(): Promise<SyncQueueItem[]> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(SYNC_STORE, 'readonly')
    return await requestResult(
      transaction.objectStore(SYNC_STORE).getAll() as IDBRequest<SyncQueueItem[]>,
      'Could not load the synchronisation queue.',
    )
  } finally {
    database.close()
  }
}

export async function setTaskSyncStatus(taskId: string, status: SyncStatus): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(TASK_STORE, 'readwrite')
    const store = transaction.objectStore(TASK_STORE)
    const task = await requestResult(store.get(taskId) as IDBRequest<TaskRecord | undefined>, 'Could not load the task.')
    if (task) store.put({ ...normalizeTask(task), syncStatus: status })
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function completeTaskSync(item: SyncQueueItem, serverTask: ServerTaskSnapshot): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([TASK_STORE, SYNC_STORE], 'readwrite')
    const taskStore = transaction.objectStore(TASK_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    const [currentTask, currentQueue] = await Promise.all([
      requestResult(taskStore.get(item.taskId) as IDBRequest<TaskRecord | undefined>, 'Could not load the synced task.'),
      requestResult(queueStore.get(item.taskId) as IDBRequest<SyncQueueItem | undefined>, 'Could not load the sync operation.'),
    ])
    if (currentTask && currentQueue?.operationId === item.operationId) {
      taskStore.put(fromServer(serverTask, currentTask.localVersion))
      queueStore.delete(item.taskId)
    } else if (currentTask && currentQueue) {
      taskStore.put({ ...normalizeTask(currentTask), serverCreatedAt: serverTask.serverCreatedAt, serverVersion: serverTask.serverVersion })
      queueStore.put({ ...currentQueue, task: { ...currentQueue.task, serverCreatedAt: serverTask.serverCreatedAt, serverVersion: serverTask.serverVersion } })
    }
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function failTaskSync(item: SyncQueueItem, message: string): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([TASK_STORE, SYNC_STORE], 'readwrite')
    const taskStore = transaction.objectStore(TASK_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    const [queue, task] = await Promise.all([
      requestResult(queueStore.get(item.taskId) as IDBRequest<SyncQueueItem | undefined>, 'Could not load the sync operation.'),
      requestResult(taskStore.get(item.taskId) as IDBRequest<TaskRecord | undefined>, 'Could not load the failed task.'),
    ])
    if (queue?.operationId === item.operationId) {
      queueStore.put({ ...queue, attempts: queue.attempts + 1, lastAttemptAt: new Date().toISOString(), lastError: message })
      if (task) taskStore.put({ ...normalizeTask(task), syncStatus: 'Sync Failed', syncError: message })
    }
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function markTaskConflict(item: SyncQueueItem, serverTask: ServerTaskSnapshot): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([TASK_STORE, SYNC_STORE], 'readwrite')
    const taskStore = transaction.objectStore(TASK_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    const [task, queue] = await Promise.all([
      requestResult(taskStore.get(item.taskId) as IDBRequest<TaskRecord | undefined>, 'Could not load the conflicting task.'),
      requestResult(queueStore.get(item.taskId) as IDBRequest<SyncQueueItem | undefined>, 'Could not load the conflicting operation.'),
    ])
    if (task) taskStore.put({ ...normalizeTask(task), syncStatus: 'Conflict Detected', syncError: 'Review the local and server versions.', conflictServerTask: serverTask, pendingPermanentDeletion: item.action === 'delete' ? false : task.pendingPermanentDeletion })
    if (queue?.operationId === item.operationId) queueStore.put({ ...queue, blockedByConflict: true, lastError: 'Conflict detected' })
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function mergeServerTasks(serverTasks: readonly ServerTaskSnapshot[]): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(TASK_STORE, 'readwrite')
    const store = transaction.objectStore(TASK_STORE)
    const localTasks = await requestResult(store.getAll() as IDBRequest<TaskRecord[]>, 'Could not load local tasks for merging.')
    const localById = new Map(localTasks.map((task) => [task.id, normalizeTask(task)]))
    for (const serverTask of serverTasks) {
      const localTask = localById.get(serverTask.id)
      if (!localTask || localTask.syncStatus === 'Synced') store.put(fromServer(serverTask, localTask?.localVersion ?? 1))
    }
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}
export async function queuePermanentTaskDeletion(task: TaskRecord): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([TASK_STORE, SYNC_STORE], 'readwrite')
    const pendingTask = { ...normalizeTask(task), syncStatus: 'Waiting to Sync' as const, pendingPermanentDeletion: true }
    const queueItem: SyncQueueItem = {
      taskId: task.id,
      operationId: crypto.randomUUID(),
      actingUserId: task.creatorId,
      action: 'delete',
      task: pendingTask,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
      blockedByConflict: false,
    }
    transaction.objectStore(TASK_STORE).put(pendingTask)
    transaction.objectStore(SYNC_STORE).put(queueItem)
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function completePermanentTaskDeletion(item: SyncQueueItem): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([TASK_STORE, SYNC_STORE], 'readwrite')
    const queueStore = transaction.objectStore(SYNC_STORE)
    const queue = await requestResult(queueStore.get(item.taskId) as IDBRequest<SyncQueueItem | undefined>, 'Could not load the deletion operation.')
    if (queue?.operationId === item.operationId) {
      transaction.objectStore(TASK_STORE).delete(item.taskId)
      queueStore.delete(item.taskId)
    }
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function applyServerTaskDeletions(taskIds: readonly string[]): Promise<void> {
  if (taskIds.length === 0) return
  const database = await openDatabase()
  try {
    const transaction = database.transaction([TASK_STORE, SYNC_STORE], 'readwrite')
    const taskStore = transaction.objectStore(TASK_STORE)
    const queueStore = transaction.objectStore(SYNC_STORE)
    for (const taskId of taskIds) {
      taskStore.delete(taskId)
      queueStore.delete(taskId)
    }
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}
