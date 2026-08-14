import { useCallback, useEffect, useRef, useState } from 'react'
import { listInventory } from '../data/inventoryRepository.ts'
import { listTasks } from '../data/taskRepository.ts'
import type { InventoryRecord } from '../domain/inventory.ts'
import type { TaskRecord } from '../domain/task.ts'
import { synchroniseInventory } from '../sync/inventorySync.ts'
import { getLastSuccessfulSync, rememberSuccessfulSync, synchroniseTasks } from '../sync/taskSync.ts'

export const SYNC_REQUEST_EVENT = 'remember-that:sync-requested'

type SyncStatusBarProps = {
  pendingCount: number
  onTasksChanged: (tasks: TaskRecord[]) => void
  onInventoryChanged: (records: InventoryRecord[]) => void
}

function formatLastSync(value: string | null): string {
  if (!value) return 'Not yet synced'
  return 'Last synced ' + new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function SyncStatusBar({ pendingCount, onTasksChanged, onInventoryChanged }: SyncStatusBarProps) {
  const [syncing, setSyncing] = useState(false)
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState(getLastSuccessfulSync)
  const [online, setOnline] = useState(navigator.onLine)
  const syncInProgress = useRef(false)

  const runSync = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return
    syncInProgress.current = true
    setSyncing(true)
    try {
      const [taskSummary, inventorySummary] = await Promise.all([synchroniseTasks(), synchroniseInventory()])
      const summaries = [taskSummary, inventorySummary]
      if (summaries.every((summary) => summary.serverReached && summary.failed === 0 && summary.conflicts === 0)) {
        rememberSuccessfulSync(new Date().toISOString())
      }
      const [tasks, inventory] = await Promise.all([listTasks(), listInventory()])
      onTasksChanged(tasks)
      onInventoryChanged(inventory)
      setLastSuccessfulSync(getLastSuccessfulSync())
    } finally {
      syncInProgress.current = false
      setSyncing(false)
    }
  }, [onInventoryChanged, onTasksChanged])

  useEffect(() => {
    const handleOnline = () => { setOnline(true); void runSync() }
    const handleOffline = () => setOnline(false)
    const handleVisibility = () => { if (document.visibilityState === 'visible') void runSync() }
    const handleRequestedSync = () => { void runSync() }

    void runSync()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener(SYNC_REQUEST_EVENT, handleRequestedSync)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(SYNC_REQUEST_EVENT, handleRequestedSync)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [runSync])

  return (
    <div className="sync-controls">
      <span className={'local-status ' + (!online ? 'offline' : '')}>
        <span aria-hidden="true"></span>
        {syncing ? 'Synchronising…' : online ? pendingCount + ' waiting to sync' : 'Offline'}
      </span>
      <span className="last-sync">{formatLastSync(lastSuccessfulSync)}</span>
      <button className="sync-button" type="button" onClick={() => void runSync()} disabled={syncing || !online}>
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
    </div>
  )
}