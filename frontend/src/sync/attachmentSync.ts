import { fetchServerAttachments } from '../api/attachmentsApi.ts'
import { listQueuedAttachments, mergeServerAttachmentMetadata } from '../data/attachmentRepository.ts'
import type { SyncSummary } from './taskSync.ts'

export async function synchroniseAttachmentMetadata(): Promise<SyncSummary> {
  const summary: SyncSummary = { synced: 0, failed: 0, conflicts: 0, serverReached: false }
  if (!navigator.onLine) return summary
  const queued = await listQueuedAttachments()
  if (queued.length > 0) summary.failed = queued.length
  try {
    await mergeServerAttachmentMetadata(await fetchServerAttachments())
    summary.serverReached = true
  } catch {
    // Cached metadata and queued local Blobs remain available offline.
  }
  return summary
}
