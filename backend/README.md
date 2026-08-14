# Remember That backend

Internal Express and TypeScript API for synchronising the Remember That PWA with Microsoft SQL Server.

## Configuration

Copy `.env.example` to `.env` and supply values for the approved internal environment. Do not commit the populated file.

`APP_ORIGIN` is the frontend origin allowed by CORS. The development default is `http://localhost:5173`.

## Database setup

Back up the target database, review the scripts, then run these migrations in order:

1. `sql/migrations/001_create_users_tasks.sql`
2. `sql/migrations/002_create_inventory.sql`

The migrations create:

- The five approved internal users
- Versioned task and inventory records with archive metadata
- Idempotent task and inventory operation receipts
- Indexes for update and active/archive queries

Each script includes recovery notes. Database credentials remain server-side.

## API

- `GET /api/v1/health`
- `GET /api/v1/tasks`
- `POST /api/v1/tasks/sync`
- `GET /api/v1/inventory`
- `POST /api/v1/inventory/sync`

Sync operations use client-generated operation IDs. Repeating the same operation does not create a duplicate record. Updates require the last known server version; stale versions receive HTTP 409 with the server record so the client can retain both versions for review.

The API enforces creator-only edits and archives for tasks and inventory independently of frontend controls. Inventory accepts only an item name and item location as editable user data. User selection is identification, not secure authentication, so production access must still be restricted to the approved company environment.

## Development

Run `npm install` followed by `npm run dev` from PowerShell in the backend directory.

## Checks

Run `npm test` and `npm run build`.
