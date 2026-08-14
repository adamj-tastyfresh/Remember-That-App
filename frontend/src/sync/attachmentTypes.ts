import type { LocalAttachmentRecord } from '../domain/attachment.ts'

export type AttachmentSyncQueueItem = {
  attachmentId: string
  operationId: string
  actingUserId: string
  attachment: LocalAttachmentRecord
  createdAt: string
  attempts: number
  lastAttemptAt: string | null
  lastError: string | null
}
