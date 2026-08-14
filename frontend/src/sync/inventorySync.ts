import { deleteLocalAttachmentsForParents } from '../data/attachmentRepository.ts'
import { deleteInventoryOnServer, fetchServerInventory, InventoryApiError, pushInventory } from '../api/inventoryApi.ts'
import {
  applyServerInventoryDeletions,
  completeInventorySync,
  completePermanentInventoryDeletion,
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
      if ((item.action ?? 'upsert') === 'delete') {
        await deleteInventoryOnServer(item)
        await completePermanentInventoryDeletion(item)
        await deleteLocalAttachmentsForParents([item.inventoryId])
      } else {
        await completeInventorySync(item, await pushInventory(item))
      }
      summary.synced += 1
      summary.serverReached = true
    } catch (error) {
      if (error instanceof InventoryApiError && error.code === 'RECORD_DELETED') {
        await completePermanentInventoryDeletion(item)
        await deleteLocalAttachmentsForParents([item.inventoryId])
        summary.synced += 1
        summary.serverReached = true
      } else if (error instanceof InventoryApiError && error.code === 'CONFLICT' && error.serverRecord) {
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
    const server = await fetchServerInventory()
    await mergeServerInventory(server.records)
    await applyServerInventoryDeletions(server.deletedIds)
    await deleteLocalAttachmentsForParents(server.deletedIds)
    summary.serverReached = true
  } catch {
    // Local inventory and queued operations remain available for retry.
  }
  return summary
}
