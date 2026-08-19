# Remember That architecture

## Purpose

Remember That is an internal, offline-first operational memory application for Tasty Fresh IT. It provides a shared task diary and inventory-location register on desktop browsers and iPhones.

## Approved technology decisions

- Frontend: React and TypeScript
- Application form: installable Progressive Web App
- Local persistence: IndexedDB, with local storage used only for the selected user preference
- Backend: dedicated Express and TypeScript API
- Central database: Microsoft SQL Server
- Attachments: IndexedDB while pending, then approved internal file storage when configured
- Hosting: approved internal Tasty Fresh infrastructure

The app is not an Expo or React Native application. It does not use the company-wide regional stored-procedure gateway unless a later approved integration decision changes this architecture.

All Remember That SQL tables, constraints, and indexes use the `remme_` prefix under the `dbo` schema. This namespace separates application-owned objects from other tables in a shared SQL Server database.

## Major views

- User selection
- Home workspace overview
- Task diary
- Inventory locations
- Global search
- Archives

Desktop uses a persistent sidebar. Supported narrow screens use bottom navigation and touch-friendly controls.

## Startup sequence

1. Restore the selected internal user ID from the device preference.
2. Render the user-selection screen when no valid user is stored.
3. Open the `remember-that` IndexedDB database.
4. Load cached tasks, inventory, and attachment metadata in parallel.
5. Enter the usable app shell using local data.
6. If the internal API is reachable, synchronise in the background.
7. Refresh local views only after safe merge rules preserve queued and conflicting data.

Critical local data is not blocked on network startup requests.

## State and persistence

| State area | Persistence | Notes |
|---|---|---|
| Selected user | Local storage | Identification preference only |
| Tasks | IndexedDB | Includes sync state and retained conflict copy |
| Inventory | IndexedDB | Includes sync state and retained conflict copy |
| Attachments | IndexedDB | Metadata and Blob stored locally while pending |
| Sync operations | IndexedDB | Separate durable task, inventory, deletion, and attachment queues |
| UI state | React component state | Current view, forms, dialogs, and transient errors |

Client-generated UUIDs allow records and attachments to be created offline. Creator identity is immutable.

## API integration

The frontend uses the versioned same-origin path `/api/v1` in production. Development may override the base URL with `VITE_API_BASE_URL`.

The dedicated API provides health, task, inventory, deletion, and attachment-metadata routes. It validates data and ownership independently of the frontend and uses parameterised SQL queries.

User selection is not authentication. Production access must therefore be restricted by approved network, domain, and hosting controls.

## Offline and synchronisation model

Record changes and their queue operations are written atomically. Server confirmation is required before a queued operation is removed or marked Synced. Failed operations remain available for retry. Version conflicts preserve both local and server values for review.

See `Synchronisation.md` for the detailed sequence and response states.

## PWA lifecycle

The service worker caches the application shell, not API responses. New versions use a user-controlled update prompt. The app does not force-refresh while a user is working; queued IndexedDB data remains intact across application updates.

## Brand implementation

The PWA uses the approved Tasty Fresh digital palette and locally bundled Barlow fonts. Interface headings use Barlow Condensed with uppercase tracking. User-entered record content retains its original case.

The current “R” mark is an application identifier, not the official Tasty Fresh logo. An official logo must not be recreated or substituted; it may only be added when an approved asset is supplied.

## Current limitations

- Internal SQL Server connectivity has not been integration tested.
- Attachment upload and download are disabled until storage location, size limits, permitted types, retention, and access rules are approved.
- Name selection does not provide secure authentication.
- Production network restriction and HTTPS termination are not yet configured in this repository.
- Supported-device PWA installation, offline launch, camera capture, and update behavior still require physical desktop/iPhone acceptance testing.
- Deployment, rollback, monitoring, and backup procedures require approved infrastructure details.
