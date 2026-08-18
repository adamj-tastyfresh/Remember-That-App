import { useRegisterSW } from 'virtual:pwa-register/react'

type UpdatePromptProps = {
  pendingCount: number
}

export function UpdatePrompt({ pendingCount }: UpdatePromptProps) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.error('Service worker registration failed:', error)
    },
  })

  if (!needRefresh) return null

  return (
    <aside className="update-prompt" aria-live="polite" aria-label="Application update available">
      <div>
        <strong>A new version is ready</strong>
        <span>{pendingCount > 0
          ? 'Your queued work will stay on this device. Update when you are ready.'
          : 'Update now to use the latest version.'}</span>
      </div>
      <div className="update-actions">
        <button type="button" onClick={() => setNeedRefresh(false)}>Later</button>
        <button className="update-button" type="button" onClick={() => void updateServiceWorker(true)}>Update app</button>
      </div>
    </aside>
  )
}
