import type { User } from '../data/users.ts'

export type SyncStatus =
  | 'Synced'
  | 'Waiting to Sync'
  | 'Synchronising'
  | 'Sync Failed'
  | 'Conflict Detected'

export type TaskRecord = {
  id: string
  title: string
  description: string
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
}

export type TaskInput = {
  title: string
  description: string
}

function validateTaskInput(input: TaskInput): TaskInput {
  const title = input.title.trim()
  const description = input.description.trim()

  if (!title) throw new Error('Enter a task title.')
  if (!description) throw new Error('Enter a task description.')

  return { title, description }
}

export function createTask(
  input: TaskInput,
  user: User,
  id: string = crypto.randomUUID(),
  now = new Date().toISOString(),
): TaskRecord {
  const validated = validateTaskInput(input)

  return {
    id,
    ...validated,
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
  }
}

export function updateTask(
  task: TaskRecord,
  input: TaskInput,
  user: User,
  now = new Date().toISOString(),
): TaskRecord {
  if (task.creatorId !== user.id) {
    throw new Error('Only the person who created this task can edit it.')
  }

  const validated = validateTaskInput(input)

  return {
    ...task,
    ...validated,
    lastModifiedAt: now,
    syncStatus: 'Waiting to Sync',
    localVersion: task.localVersion + 1,
  }
}

export function archiveTask(
  task: TaskRecord,
  user: User,
  now = new Date().toISOString(),
): TaskRecord {
  if (task.creatorId !== user.id) {
    throw new Error('Only the person who created this task can archive it.')
  }

  return {
    ...task,
    archived: true,
    archivedAt: now,
    archivedBy: user.id,
    lastModifiedAt: now,
    syncStatus: 'Waiting to Sync',
    localVersion: task.localVersion + 1,
  }
}

export function hasUnsynchronisedTasks(tasks: readonly TaskRecord[], userId: string): boolean {
  return tasks.some((task) => task.creatorId === userId && task.syncStatus !== 'Synced')
}
