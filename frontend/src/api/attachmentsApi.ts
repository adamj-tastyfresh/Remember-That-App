import type { AttachmentParentType, ServerAttachmentMetadata } from '../domain/attachment.ts'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(new RegExp('/$'), '') ?? '/api/v1'

export async function fetchServerAttachments(parentRecordType?: AttachmentParentType, parentRecordId?: string): Promise<ServerAttachmentMetadata[]> {
  const query = parentRecordType && parentRecordId ? `?parentRecordType=${encodeURIComponent(parentRecordType)}&parentRecordId=${encodeURIComponent(parentRecordId)}` : ''
  const response = await fetch(API_BASE_URL + '/attachments' + query, { headers: { Accept: 'application/json' } })
  const body = await response.json().catch(() => null) as { data?: ServerAttachmentMetadata[]; error?: { message?: string } } | null
  if (!response.ok) throw new Error(body?.error?.message ?? 'Attachment metadata is unavailable.')
  if (!Array.isArray(body?.data)) throw new Error('The attachment server returned an invalid response.')
  return body.data
}
