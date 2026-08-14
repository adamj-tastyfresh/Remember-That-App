# Task and inventory synchronisation

## Current flow

1. Creating, editing, or archiving a task or inventory record writes the record and its sync operation to IndexedDB in one transaction.
2. Each queue keeps one current operation per record. A newer local edit replaces the queued snapshot while retaining the record itself.
3. Synchronisation runs when the app opens, regains connectivity, returns to the foreground, receives a new local change, or the user selects Sync now.
4. Task and inventory queues run together. The last-successful-sync time advances only when both endpoints are reachable and neither queue reports a failure or conflict.
5. The server checks the operation ID, selected user, immutable creator, and last known server version inside a serializable SQL transaction.
6. Only a confirmed server response removes the queued operation and marks the local record as Synced.
7. Timeouts and unavailable-server failures keep the operation queued as Sync Failed for retry.
8. A version mismatch keeps the local record and stores the server record alongside it as Conflict Detected. Conflict resolution UI is a later milestone.
9. After pushes, the client fetches server records and merges them only when no unsynchronised local version would be overwritten.

## API response states

- HTTP 200: saved or an idempotent repeat
- HTTP 400: invalid payload
- HTTP 403: unknown user or ownership violation
- HTTP 409: version conflict or mismatched operation ID
- HTTP 503: SQL Server unavailable
- HTTP 500: unexpected sync failure

## Development setup

Run `backend/sql/migrations/001_create_users_tasks.sql` followed by
`backend/sql/migrations/002_create_inventory.sql`, configure `backend/.env`, and
optionally create `frontend/.env` from `frontend/.env.example`.

The SQL Server integration cannot be exercised until an approved internal SQL
Server, database, and credentials are supplied. Unit tests and TypeScript builds
do not require those credentials.
