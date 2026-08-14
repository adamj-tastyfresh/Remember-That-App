import { fetchServerTasks, pushTask, TaskApiError } from '../api/tasksApi.ts'
import {
  completeTaskSync,
  failTaskSync,
  listQueuedTasks,
  markTaskConflict,
  mergeServerTasks,
  setTaskSyncStatus,
} from '../data/taskRepository.ts'

const LAST_SYNC_KEY = 'remember-that.last-successful-sync'

export type SyncSummary = {
  synced: number
  failed: number
  conflicts: number
  serverReached: boolean
}

export function getLastSuccessfulSync(): string | null {
  try { return window.localStorage.getItem(LAST_SYNC_KEY) } catch { return null }
}

export function rememberSuccessfulSync(value: string): void {
  try {
    window.localStorage.setItem(LAST_SYNC_KEY, value)
  } catch {
    // Synchronisation remains valid when the status preference cannot be stored.
  }
}

export async function synchroniseTasks(): Promise<SyncSummary> {
  const summary: SyncSummary = { synced: 0, failed: 0, conflicts: 0, serverReached: false }
  if (!navigator.onLine) return summary

  const queue = await listQueuedTasks()
  for (const item of queue) {
    if (item.blockedByConflict) {
      summary.conflicts += 1
      continue
    }
    await setTaskSyncStatus(item.taskId, 'Synchronising')
    try {
      await completeTaskSync(item, await pushTask(item))
      summary.synced += 1
      summary.serverReached = true
    } catch (error) {
      if (error instanceof TaskApiError && error.code === 'CONFLICT' && error.serverTask) {
        await markTaskConflict(item, error.serverTask)
        summary.conflicts += 1
        summary.serverReached = true
      } else {
        await failTaskSync(item, error instanceof Error ? error.message : 'The task server is unavailable.')
        summary.failed += 1
        if (error instanceof TaskApiError) summary.serverReached = true
        if (!(error instanceof TaskApiError)) break
      }
    }
  }

  try {
    await mergeServerTasks(await fetchServerTasks())
    summary.serverReached = true
  } catch {
    // Pending local data remains queued and is retried on the next sync trigger.
  }
  return summary
}