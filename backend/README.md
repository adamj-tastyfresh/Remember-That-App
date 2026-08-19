# Remember That backend

Internal Express and TypeScript API for synchronising the Remember That PWA with Microsoft SQL Server.

## Configuration

Copy `.env.example` to `.env` and supply values for the approved internal environment. Do not commit the populated file.

`APP_ORIGIN` is the frontend origin allowed by CORS. The development default is `http://localhost:5173`.

## Database setup

Back up the target database and review the scripts. First copy `sql/security/000_create_app_login.sql` outside the repository, replace its database and password placeholders, and run it as a SQL Server administrator. Never save or commit the populated copy.

Then run these migrations in order while connected to the target database:

1. `sql/migrations/001_create_users_tasks.sql`
2. `sql/migrations/002_create_inventory.sql`
3. `sql/migrations/003_create_deletion_log.sql`
4. `sql/migrations/004_create_attachments.sql`
5. `sql/migrations/005_grant_app_permissions.sql`

The migrations create:

- The five approved internal users
- Versioned task and inventory records with archive metadata
- Idempotent task and inventory operation receipts
- Permanent-deletion tombstones and a minimal deletion audit log
- Attachment metadata and idempotent attachment-operation receipts
- Indexes for update and active/archive queries
- A least-privilege `remme_app_role` with access only to the application tables

Every application-owned SQL table and supporting database object uses the `remme_` namespace (for example, `dbo.remme_Tasks` and `PK_remme_Tasks`) to avoid collisions in a shared database. The public `/api/v1` routes are unchanged.

Each script includes recovery notes. Configure the backend with the `remme_app` login after migration 005 succeeds. Database credentials remain server-side.

## API

- `GET /api/v1/health`
- `GET /api/v1/tasks`
- `POST /api/v1/tasks/sync`
- `POST /api/v1/tasks/delete`
- `GET /api/v1/inventory`
- `POST /api/v1/inventory/sync`
- `POST /api/v1/inventory/delete`
- `GET /api/v1/attachments`

Sync operations use client-generated operation IDs. Repeating the same operation does not create a duplicate record. Updates require the last known server version; stale versions receive HTTP 409 with the server record so the client can retain both versions for review.

The API enforces creator-only edits, archives, and permanent deletions for tasks and inventory independently of frontend controls. Inventory accepts only an item name and item location as editable user data. User selection is identification, not secure authentication, so production access must still be restricted to the approved company environment.

## Development

Run `npm install` followed by `npm run dev` from PowerShell in the backend directory.

A production artifact is built with `npm run build` and started with `npm start`. Service hosting, reverse proxy, HTTPS termination, and deployment paths require approved internal infrastructure details; see `../Operations.md`.

## Checks

Run `npm test` and `npm run build`.


## Attachment storage boundary

Migration 004 and the current API cover metadata only. The API deliberately does not expose internal storage references. Upload and download endpoints must not be enabled until the approved Tasty Fresh internal file-storage location, limits, and file-type policy are supplied.
