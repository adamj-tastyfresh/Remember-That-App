import type { TaskRecord } from '../domain/task.ts'

export type SyncQueueItem = {
  taskId: string
  operationId: string
  actingUserId: string
  task: TaskRecord
  createdAt: string
  attempts: number
  lastAttemptAt: string | null
  lastError: string | null
  blockedByConflict: boolean
}