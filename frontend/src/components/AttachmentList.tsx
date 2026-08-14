import type { LocalAttachmentRecord } from '../domain/attachment.ts'

type AttachmentListProps = {
  attachments: readonly LocalAttachmentRecord[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) return null
  return (
    <section className="attachment-summary" aria-label="Attachments">
      <strong><span aria-hidden="true">⌕</span>{attachments.length} {attachments.length === 1 ? 'attachment' : 'attachments'}</strong>
      <ul>
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            <span className="attachment-name">{attachment.originalFilename}</span>
            <span>{formatFileSize(attachment.fileSize)} · {attachment.syncStatus}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
