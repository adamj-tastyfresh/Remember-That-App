# Remember That backend

Internal Express and TypeScript API for synchronising the Remember That PWA with Microsoft SQL Server.

## Configuration

Copy .env.example to .env and supply values for the approved internal environment. Do not commit the populated file.

APP_ORIGIN is the frontend origin allowed by CORS. The development default is http://localhost:5173.

## Database setup

Back up the target database, review, and run sql/migrations/001_create_users_tasks.sql.

The migration creates:

- The five approved internal users
- Versioned task records with archive metadata
- Idempotent task-operation receipts
- Indexes for task updates and active/archive views

The script includes recovery notes. Database credentials remain server-side.

## API

- GET /api/v1/health
- GET /api/v1/tasks
- POST /api/v1/tasks/sync

Task sync operations use client-generated operation IDs. Repeating the same operation does not create a duplicate task. Updates require the last known server version; stale versions receive HTTP 409 with the server record so the client can retain both versions for review.

The API enforces creator-only edits and archives independently of frontend controls. User selection is identification, not secure authentication, so production access must still be restricted to the approved company environment.

## Development

Run npm install followed by npm run dev from PowerShell in the backend directory.

## Checks

Run npm test and npm run build.