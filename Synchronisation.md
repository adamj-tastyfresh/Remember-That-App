# Task and inventory synchronisation

## Current flow

1. Creating, editing, or archiving a task or inventory record writes the record and its sync operation to IndexedDB in one transaction.
2. Each queue keeps one current operation per record. A newer local edit replaces the queued snapshot while retaining the record itself.
3. Synchronisation runs when the app opens, regains connectivity, returns to the foreground, receives a new local change, or the user selects Sync now.
4. Task and inventory queues run together. The last-successful-sync time advances only when both endpoints are reachable and neither queue reports a failure or conflict.
5. The server checks the operation ID, selected user, immutable creator, and last known server version inside a serializable SQL transaction.
6. Only a confirmed server response removes the queued operation and marks the local record as Synced.
7. Timeouts and unavailable-server failures keep the operation queued as Sync Failed for retry.
8. A version mismatch keeps the local record and stores the server record alongside it as Conflict Detected. Both versions remain visible for review; a separate conflict-resolution milestone is not planned.
9. Permanent deletion replaces any queued update with a persistent delete operation, immediately hides the archived record, and retries until the server confirms deletion.
10. The server retains a minimal deletion tombstone so stale queued edits are rejected and other devices remove cached copies.
11. After pushes, the client fetches server records and deletion tombstones, then merges them without silently overwriting unsynchronised local data.
12. File and camera selections are validated, then their attachment Blobs, metadata, and queue entries are stored atomically in IndexedDB. Upload processing remains disabled until approved internal file storage and its server-side size policy are configured.

## API response states

- HTTP 200: saved or an idempotent repeat
- HTTP 400: invalid payload
- HTTP 403: unknown user or ownership violation
- HTTP 409: version conflict or mismatched operation ID
- HTTP 410: a stale queued edit targeted a permanently deleted record
- HTTP 503: SQL Server unavailable
- HTTP 500: unexpected sync failure

## Development setup

Run the administrator bootstrap `backend/sql/security/000_create_app_login.sql`, then run
`backend/sql/migrations/001_create_users_tasks.sql` followed by
`backend/sql/migrations/002_create_inventory.sql` followed by
`backend/sql/migrations/003_create_deletion_log.sql` followed by
`backend/sql/migrations/004_create_attachments.sql` followed by
`backend/sql/migrations/005_grant_app_permissions.sql`. Configure `backend/.env`, and
optionally create `frontend/.env` from `frontend/.env.example`.

The SQL Server integration cannot be exercised until an approved internal SQL
Server, database, and credentials are supplied. Unit tests and TypeScript builds
do not require those credentials.
