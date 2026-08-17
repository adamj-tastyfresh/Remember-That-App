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
- Creator-only permanent deletion from Archives with explicit confirmation
- Offline deletion tombstones that remove cached copies across devices
- IndexedDB attachment metadata, Blob storage, and persistent upload queues
- Creator-only multi-file selection and supported-device camera capture on active records
- Safe filename, configurable size, and configurable MIME-type validation foundations
- Record-level display for locally cached attachment metadata
- Offline global search across active tasks and inventory
- Case-insensitive partial-word matching across content, locations, and creators
- Clearly labelled task and inventory search results; archived records stay excluded
- Persistent task and inventory synchronization queues with visible states
- Automatic sync on app open, reconnect, foreground return, and local changes
- Manual retry, last-successful-sync time, and retained conflict copies
- A warning before switching users when the current user has pending changes

The user selection identifies record ownership only. It is not secure authentication.

## Local storage

The selected internal user ID is stored as the small device preference
`remember-that.current-user-id` in local storage.

Task, inventory, attachment metadata, attachment Blobs, and their persistent queues are stored in the `remember-that` IndexedDB database.
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


## Attachment controls and storage boundary

Creators can select multiple files or capture a photo for their active task and inventory records. Selected images, PDFs, Word documents, and plain-text files are validated and stored offline with their metadata and durable queue entry in one IndexedDB transaction.

No company-approved maximum file size has been supplied, so the frontend does not invent one; browser quota failures are reported without discarding existing queued data. Transfer remains disabled until the approved internal file store and server-side size policy are configured. No attachment is marked uploaded before that storage integration confirms it.
