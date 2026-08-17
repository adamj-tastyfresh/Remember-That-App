import type { AttachmentPolicy } from '../domain/attachment.ts'

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const

export const ATTACHMENT_FILE_ACCEPT = ALLOWED_ATTACHMENT_MIME_TYPES.join(',')

// A company-approved server limit has not been supplied yet. IndexedDB will
// report its own quota failure; the future upload API must enforce the approved
// production size policy before accepting any file.
export const LOCAL_ATTACHMENT_POLICY: AttachmentPolicy = {
  maxFileSizeBytes: Number.MAX_SAFE_INTEGER,
  allowedMimeTypes: ALLOWED_ATTACHMENT_MIME_TYPES,
}
