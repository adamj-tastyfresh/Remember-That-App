import type { User } from '../data/users.ts'
import type { SyncStatus } from './task.ts'

export type AttachmentParentType = 'task' | 'inventory'

export type ServerAttachmentMetadata = {
  id: string
  parentRecordId: string
  parentRecordType: AttachmentParentType
  originalFilename: string
  storedFilename: string
  fileType: string
  fileSize: number
  uploadedById: string
  uploadedByName: string
  deviceCreatedAt: string
  serverCreatedAt: string
  storageReference: string
}

export type LocalAttachmentRecord = {
  id: string
  parentRecordId: string
  parentRecordType: AttachmentParentType
  originalFilename: string
  fileType: string
  fileSize: number
  uploadedById: string
  uploadedByName: string
  deviceCreatedAt: string
  serverCreatedAt: string | null
  storedFilename: string | null
  storageReference: string | null
  syncStatus: SyncStatus
  syncError: string | null
  localBlob: Blob | null
}

export type AttachmentPolicy = {
  maxFileSizeBytes: number
  allowedMimeTypes: readonly string[]
}

export type LocalAttachmentInput = {
  parentRecordId: string
  parentRecordType: AttachmentParentType
  originalFilename: string
  fileType: string
  localBlob: Blob
}

function validateFilename(value: string): string {
  const filename = value.trim()
  if (!filename) throw new Error('The attachment filename is required.')
  if (filename.length > 255) throw new Error('Attachment filenames must be 255 characters or fewer.')
  if (filename.includes('/') || filename.includes('\\') || filename.includes('\0') || filename === '.' || filename === '..') {
    throw new Error('The attachment filename is unsafe.')
  }
  return filename
}

export function createLocalAttachment(
  input: LocalAttachmentInput,
  user: User,
  policy: AttachmentPolicy,
  id: string = crypto.randomUUID(),
  now = new Date().toISOString(),
): LocalAttachmentRecord {
  if (!input.parentRecordId.trim()) throw new Error('The attachment parent record is required.')
  if (!Number.isInteger(policy.maxFileSizeBytes) || policy.maxFileSizeBytes < 1) throw new Error('The attachment size policy is invalid.')
  if (input.localBlob.size < 1) throw new Error('Empty files cannot be attached.')
  if (input.localBlob.size > policy.maxFileSizeBytes) throw new Error('This file exceeds the configured attachment size limit.')
  const fileType = input.fileType.trim().toLowerCase()
  if (!fileType) throw new Error('The attachment file type is required.')
  if (policy.allowedMimeTypes.length > 0 && !policy.allowedMimeTypes.map((type) => type.toLowerCase()).includes(fileType)) {
    throw new Error('This file type is not approved for attachments.')
  }
  return {
    id,
    parentRecordId: input.parentRecordId.trim(),
    parentRecordType: input.parentRecordType,
    originalFilename: validateFilename(input.originalFilename),
    fileType,
    fileSize: input.localBlob.size,
    uploadedById: user.id,
    uploadedByName: user.name,
    deviceCreatedAt: now,
    serverCreatedAt: null,
    storedFilename: null,
    storageReference: null,
    syncStatus: 'Waiting to Sync',
    syncError: null,
    localBlob: input.localBlob,
  }
}
