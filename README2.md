# Tasty SQL / Tasty Fresh — AI Onboarding Docs

This folder is optimized for an AI assistant to become productive quickly.

**Remember That URL:** `https://rememberthat.tastytrucks.com.au`

## Recommended reading order (AI)
1. `TastyFresh_AI_Reference.md` — business concepts, depot mapping, and “which system to use” decision rules.
2. `sql-server-2025-cutover-handover.md` — post-cutover baseline, migration status, and infra prerequisites.
3. `sql-server-documentation.md` — authoritative SQL Server + database inventory and connection guidelines.
4. `sql-server-email-profile-guide.md` — dedicated guide for sending email with Database Mail profile `TastyTrucks`.
5. `TASTY_API_ARCHITECTURE.md` — API gateway contract and stored-procedure standards (SQL Server 2025 baseline).
6. `regional-database-structure.md` — regional schema concepts, key tables, and common patterns.
7. `regional-database-table-schemas.md` — detailed field-level schemas (reference; only when needed).

## File map (what each doc is for)
- `TastyFresh_AI_Reference.md`: Quickstart, glossary, depot/region mapping, DB selection rules.
- `sql-server-2025-cutover-handover.md`: Post-Aug-1 migration handover, checklist metrics, and operational prerequisites.
- `sql-server-documentation.md`: Server/database inventory, what’s “primary”, and development standards.
- `sql-server-email-profile-guide.md`: How to use `msdb.dbo.sp_send_dbmail` with profile `TastyTrucks`.
- `TASTY_API_ARCHITECTURE.md`: Endpoint registry model + REST contract + JSON stored-proc pattern.
- `regional-database-structure.md`: High-level domain model; table categories; “avoid querying” guidance.
- `regional-database-table-schemas.md`: Exact columns for common tables.
- `Tasty Fresh General Infrastructure Document.md`: Text-first modernization summary converted from legacy binary source.

## Conventions (keep consistent across docs)
- **Regional DB names**: `TastyDat`, `TastyDatNSW`, `TastyDatWA`, `TastyDatQLD`.
- **Cross-regional**: `TastyFilemaker` (consolidation/integration).
- **Stored procedure naming**: NO `sp_` prefix (use `updateAccountLastUsedRound`, NOT `sp_updateAccountLastUsedRound`).
- **Stored procedure inputs**: one parameter only: `@jsonData VARCHAR(MAX)`.
- **Stored procedure outputs**: JSON only (prefer `FOR JSON PATH` as default JSON output pattern on SQL Server 2025).

## AI “which database do I use?”
- **Single region queries**: use the regional DB for that depot/state.
- **Cross-region consolidation**: prefer `TastyFilemaker` (and filter by `[state]` where applicable).
- **Archives / history**: use the `*Archive` or yearly archive DBs only when explicitly needed.

## Security note
Do not store passwords or API keys in this repo. Put credentials in a secure secret store/password manager and reference them via environment variables or a secure runbook.
