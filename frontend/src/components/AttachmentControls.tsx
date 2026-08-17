import { useRef, useState } from 'react'
import { ATTACHMENT_FILE_ACCEPT } from '../config/attachmentPolicy.ts'

type AttachmentControlsProps = {
  recordName: string
  saving: boolean
  onSelect: (files: readonly File[]) => Promise<void>
}

export function AttachmentControls({ recordName, saving, onSelect }: AttachmentControlsProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const selectFiles = async (files: FileList | null, input: HTMLInputElement) => {
    if (!files?.length) return
    setError('')
    try {
      await onSelect(Array.from(files))
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : 'Could not store the selected attachment.')
    } finally {
      input.value = ''
    }
  }

  return (
    <section className="attachment-controls" aria-label={'Add attachments to ' + recordName}>
      <div className="attachment-buttons">
        <button className="attachment-button" type="button" disabled={saving} onClick={() => fileInput.current?.click()}>
          <span aria-hidden="true">+</span>{saving ? 'Saving...' : 'Attach file'}
        </button>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept={ATTACHMENT_FILE_ACCEPT}
          multiple
          tabIndex={-1}
          disabled={saving}
          onChange={(event) => void selectFiles(event.currentTarget.files, event.currentTarget)}
        />
        <button className="attachment-button camera" type="button" disabled={saving} onClick={() => cameraInput.current?.click()}>
          <span aria-hidden="true">◉</span>{saving ? 'Saving...' : 'Take photo'}
        </button>
        <input
          ref={cameraInput}
          className="visually-hidden"
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          disabled={saving}
          onChange={(event) => void selectFiles(event.currentTarget.files, event.currentTarget)}
        />
      </div>
      <small>Stored on this device until internal upload is configured.</small>
      {error && <p className="attachment-error" role="alert">{error}</p>}
    </section>
  )
}
