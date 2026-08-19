# Remember That operations and readiness

This document records known commands and release gates without inventing internal infrastructure values.

## Local development

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Optional development configuration:

```text
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

### Backend

```powershell
cd backend
npm install
npm run dev
```

Copy `backend/.env.example` to `backend/.env` and supply approved development values. Never commit the populated file.

## Automated checks

```powershell
cd frontend
npm test
npm run lint
npm run build

cd ..\backend
npm test
npm run build
```

A successful build is local verification, not proof of internal integration or production readiness.

## Database preparation

Back up the target database and review each script before execution. Copy `backend/sql/security/000_create_app_login.sql` outside the repository, populate its placeholders, and run it as a SQL Server administrator. Do not save the populated copy in the repository.

Then run migrations in order while connected to the target database:

1. `backend/sql/migrations/001_create_users_tasks.sql`
2. `backend/sql/migrations/002_create_inventory.sql`
3. `backend/sql/migrations/003_create_deletion_log.sql`
4. `backend/sql/migrations/004_create_attachments.sql`
5. `backend/sql/migrations/005_grant_app_permissions.sql`

Migration 005 grants the `remme_app` database user access only to the eight `dbo.remme_*` tables. Each migration contains its own recovery guidance. Do not run production migrations until the database, backup owner, maintenance window, and rollback authority are confirmed.

## Production build commands

```powershell
cd frontend
npm ci
npm run build

cd ..\backend
npm ci
npm run build
npm start
```

These commands produce and start application artifacts only. The approved Windows/Linux service wrapper, reverse proxy, TLS certificate, filesystem locations, and deployment account remain infrastructure decisions.

## Required production decisions

The following information is still required before deployment:

- Approved application host and operating system
- Reverse proxy and HTTPS termination process
- Network/domain access restriction
- SQL Server hostname, database, service identity, and certificate policy
- Secret storage and rotation process
- Approved internal attachment root
- Attachment size and permitted/prohibited type policy
- Attachment backup, retention, deletion, and recovery process
- Application log destination and retention
- Health monitoring and alert ownership
- Release artifact location and service restart procedure
- Database and application rollback authority
- Supported desktop browser and iPhone acceptance matrix

## Deployment gate

Before a production release:

1. Confirm the working tree and release commit.
2. Run frontend and backend checks from a clean dependency install.
3. Confirm no secrets, `.env` files, uploads, build artifacts, or unrelated infrastructure documents are staged.
4. Back up the target database and record the restore point.
5. Review migrations and recovery notes.
6. Build versioned application artifacts.
7. Deploy using the approved internal process.
8. Run health, user-selection, local cache, task, inventory, search, archive, sync, and attachment smoke checks.
9. Verify offline launch and reconnect behavior.
10. Record release, migration, verification, and rollback results.

## Rollback principles

- Keep the previous application artifact available until acceptance checks pass.
- Prefer application rollback before database rollback when migrations remain backward compatible.
- Follow the recovery notes in each migration rather than improvising destructive SQL.
- Restore a database backup only through the approved operational process.
- Preserve IndexedDB queues; never instruct users to clear site data as a routine rollback step.

Exact rollback commands cannot be documented until the production host and deployment mechanism are approved.

## Troubleshooting

### Frontend cannot reach the API

- Confirm whether the device is expected to be offline.
- Check `VITE_API_BASE_URL` in development or same-origin `/api/v1` routing in production.
- Confirm the backend is running and CORS `APP_ORIGIN` matches the frontend origin.
- Do not clear IndexedDB; pending records should remain queued.

### Backend reports SQL Server unavailable

- Confirm the approved internal network is available.
- Check server-side environment configuration without printing credentials.
- Verify the database exists and migrations have been applied in order.
- Review server logs; do not expose raw database errors to users.

### Local storage is blocked

- Close other stale tabs using the app and retry.
- Confirm the browser allows persistent site storage.
- Preserve existing site data while diagnosing the failure.

### Changes remain waiting to sync

- Confirm connectivity to the internal API, not merely general internet access.
- Use Sync now for a controlled retry.
- Check the visible record error and server logs.
- Do not remove queue entries manually.

### Attachments never upload

This is expected until approved internal attachment storage is configured. Selected files remain local and queued.

### New app version is available

Use the in-app update prompt. When work is queued, confirm it remains visible before updating. The update must not require clearing local data.

## Known limitations

See `Architecture.md`. Update both documents whenever an infrastructure decision closes or changes a limitation.
