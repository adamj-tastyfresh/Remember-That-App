# Remember That frontend

React and TypeScript Progressive Web App for the Tasty Fresh IT task diary and inventory location tracker.

## Current milestone

The frontend now includes:

- A responsive desktop sidebar and mobile bottom navigation shell
- Device-persistent selection for Doug, Daniel, Mary, Adam, or Jabbar
- Stable internal user IDs kept separate from display names
- Offline task and inventory records backed by IndexedDB
- Task creation, editing, and archiving
- Inventory creation, location editing, and archiving
- Creator-only edit and archive controls for both record types
- A combined retained Archives view
- Persistent task and inventory synchronization queues with visible states
- Automatic sync on app open, reconnect, foreground return, and local changes
- Manual retry, last-successful-sync time, and retained conflict copies
- A warning before switching users when the current user has pending changes

The user selection identifies record ownership only. It is not secure authentication.

## Local storage

The selected internal user ID is stored as the small device preference
`remember-that.current-user-id` in local storage.

Task and inventory records are stored in the `remember-that` IndexedDB database.
Each record has a client-generated UUID, immutable creator details, device creation
time, archive metadata, local/server version fields, and synchronisation state.
Inventory records deliberately contain only Item Name, Item Location, Created By,
and Date Created as user-facing data.

Changes remain queued until the internal API confirms them. Failed requests are
retained for retry, and conflicts preserve both local and server versions. See
`../Synchronisation.md` for the full flow and setup.

## Development

```powershell
npm install
npm run dev
```

Open `layout-preview.html` directly for a standalone interactive layout review.

## Checks

```powershell
npm test
npm run lint
npm run build
```

The production build includes the configured PWA service worker and web app
manifest.
