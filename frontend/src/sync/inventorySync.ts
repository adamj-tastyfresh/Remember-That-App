import { fetchServerInventory, InventoryApiError, pushInventory } from '../api/inventoryApi.ts'
import {
  completeInventorySync,
  failInventorySync,
  listQueuedInventory,
  markInventoryConflict,
  mergeServerInventory,
  setInventorySyncStatus,
} from '../data/inventoryRepository.ts'
import type { SyncSummary } from './taskSync.ts'

export async function synchroniseInventory(): Promise<SyncSummary> {
  const summary: SyncSummary = { synced: 0, failed: 0, conflicts: 0, serverReached: false }
  if (!navigator.onLine) return summary

  const queue = await listQueuedInventory()
  for (const item of queue) {
    if (item.blockedByConflict) {
      summary.conflicts += 1
      continue
    }
    await setInventorySyncStatus(item.inventoryId, 'Synchronising')
    try {
      await completeInventorySync(item, await pushInventory(item))
      summary.synced += 1
      summary.serverReached = true
    } catch (error) {
      if (error instanceof InventoryApiError && error.code === 'CONFLICT' && error.serverRecord) {
        await markInventoryConflict(item, error.serverRecord)
        summary.conflicts += 1
        summary.serverReached = true
      } else {
        await failInventorySync(item, error instanceof Error ? error.message : 'The inventory server is unavailable.')
        summary.failed += 1
        if (error instanceof InventoryApiError) summary.serverReached = true
        if (!(error instanceof InventoryApiError)) break
      }
    }
  }

  try {
    await mergeServerInventory(await fetchServerInventory())
    summary.serverReached = true
  } catch {
    // Local inventory and queued operations remain available for retry.
  }
  return summary
}