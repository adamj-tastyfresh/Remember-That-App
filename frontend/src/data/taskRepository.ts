import type { TaskRecord } from '../domain/task.ts'

const DATABASE_NAME = 'remember-that'
const DATABASE_VERSION = 1
const TASK_STORE = 'tasks'

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
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local task storage.'))
    request.onblocked = () => reject(new Error('Local task storage is blocked by another app window.'))
  })
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the local task.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('The local task save was cancelled.'))
  })
}

export async function listTasks(): Promise<TaskRecord[]> {
  const database = await openDatabase()

  try {
    const transaction = database.transaction(TASK_STORE, 'readonly')
    const request = transaction.objectStore(TASK_STORE).getAll()
    const tasks = await new Promise<TaskRecord[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as TaskRecord[])
      request.onerror = () => reject(request.error ?? new Error('Could not load local tasks.'))
    })

    return tasks.sort((first, second) => second.deviceCreatedAt.localeCompare(first.deviceCreatedAt))
  } finally {
    database.close()
  }
}

export async function saveTask(task: TaskRecord): Promise<void> {
  const database = await openDatabase()

  try {
    const transaction = database.transaction(TASK_STORE, 'readwrite')
    transaction.objectStore(TASK_STORE).put(task)
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}
