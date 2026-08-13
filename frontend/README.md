# Remember That frontend

React and TypeScript Progressive Web App for the Tasty Fresh IT task diary and inventory location tracker.

## Current milestone

The frontend now includes:

- A responsive desktop sidebar and mobile bottom navigation shell
- Device-persistent selection for Doug, Daniel, Mary, Adam, or Jabbar
- Stable internal user IDs kept separate from display names
- An offline task diary backed by IndexedDB
- Create and list operations for active tasks
- Creator-only task editing and archiving
- A retained Archives view
- A persistent IndexedDB synchronization queue with visible sync states
- Automatic sync on app open, reconnect, foreground return, and local changes
- Manual retry, last-successful-sync time, and retained conflict copies
- A warning before switching users when the current user has pending changes

The user selection identifies record ownership only. It is not secure authentication.

## Local storage

The selected internal user ID is stored as the small device preference
`remember-that.current-user-id` in local storage.

Task records are stored in the `remember-that` IndexedDB database. Each record
has a client-generated UUID, immutable creator details, device creation time,
archive metadata, local/server version fields, and synchronisation state.

Task changes remain queued until the internal API confirms them. Failed requests
are retained for retry, and conflicts preserve both the local and server versions.
See `../Synchronisation.md` for the full flow and setup.

## Development

```powershell
npm install
npm run dev
```

## Checks

```powershell
npm test
npm run lint
npm run build
```

The production build includes the configured PWA service worker and web app
manifest.