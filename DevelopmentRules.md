# Remember That — Coding Rules

Documentation precedence and company-standard overrides are defined in `DocumentationPolicy.md`. Project-specific requirements remain authoritative when a general company reference differs.

## 1. General Development Principles

1. Keep the application simple, maintainable, and easy for a beginner developer to understand.
2. Prefer clear and direct code over advanced abstractions.
3. Do not introduce unnecessary frameworks, libraries, services, or architectural patterns.
4. Do not add features that are not defined in the approved app documentation.
5. Do not make major architectural changes without explaining the reason first.
6. Preserve existing working functionality unless a change is specifically required.
7. Avoid rewriting large sections of working code when a smaller targeted change will solve the problem.
8. Use consistent naming, folder structure, formatting, and coding conventions throughout the project.
9. Write code that can be maintained primarily through Visual Studio Code and GitHub Copilot.
10. Assume the primary maintainer is a beginner developer and keep implementation decisions understandable.

## 2. Technology Rules

1. The frontend must use React.
2. Use TypeScript unless there is a documented reason not to.
3. The application must be built as a Progressive Web App.
4. The application must work on desktop browsers and iOS devices.
5. The application must use Microsoft SQL Server as the central database.
6. The React application must never connect directly to SQL Server.
7. All database access must pass through an internal backend API.
8. The app must not depend on Microsoft Azure.
9. The app must not depend on public cloud services.
10. All application data must remain within the company network.
11. Do not introduce server software that requires a new installation without approval.
12. Use only hosting and server components already approved or available internally.
13. The production URL must be:

```text
https://rememberthat.tastyfresh.com.au
```

## 3. Offline-First Rules

1. The app must continue working when completely disconnected from all networks.
2. The installed PWA must open while offline.
3. Use a service worker to cache the application shell and required static assets.
4. Use IndexedDB for local application data.
5. Do not use localStorage as the primary database.
6. Users must be able to create records while offline.
7. Users must be able to edit their own records while offline.
8. Users must be able to archive their own records while offline.
9. Users must be able to search locally cached records while offline.
10. All offline changes must be stored in a persistent synchronisation queue.
11. Pending changes must survive browser restarts and device restarts.
12. Synchronisation must resume automatically when the internal network becomes available.
13. Failed synchronisation attempts must remain queued for retry.
14. Never discard an unsynchronised record without explicit user confirmation.
15. Never report a record as synchronised until the server confirms it was saved successfully.
16. Display a visible synchronisation status for records and attachments.
17. Supported synchronisation states should include:

```text
Synced
Waiting to Sync
Synchronising
Sync Failed
Conflict Detected
```

18. Display the last successful synchronisation time.
19. Provide a manual retry option for failed synchronisation.
20. Do not assume the browser Background Sync API is always available.
21. The app must also attempt synchronisation when it opens, regains connectivity, or returns to the foreground.

## 4. User Identification Rules

1. The app will not use conventional authentication.
2. The current user must select their name from a dropdown.
3. The available users are:

```text
Doug
Daniel
Mary
Adam
Jabbar
```

4. Store a permanent internal user ID separately from the display name.
5. Do not use the display name as the database primary key.
6. Remember the selected user on the current device.
7. Allow the selected user to be changed from the app settings or user menu.
8. Clearly display the currently selected user.
9. Before changing the selected user, warn if unsynchronised changes exist.
10. The system must treat user selection as identification only, not secure authentication.
11. Do not describe the user-selection system as secure authentication.
12. The application must only be available through the approved company environment and company domain.

## 5. Record Ownership Rules

1. Every task and inventory record must have a creator ID.
2. The creator ID must be assigned when the record is first created.
3. The creator ID must never change after creation.
4. All users may view active records.
5. Only the creator may edit their record.
6. Only the creator may archive their record.
7. Only the creator may permanently delete their archived record unless the requirements change later.
8. Ownership rules must be enforced by both the frontend and backend.
9. Frontend controls alone are not sufficient security or validation.
10. The backend must reject edit, archive, or deletion requests from a user who is not the creator.
11. Historical records must continue showing the original creator.
12. Do not remove creator information if a user is no longer active.

## 6. Task Record Rules

1. The initial task model must remain minimal.
2. A task must include:

```text
Title
Description
Created By
Date Created
```

3. The database may also store technical fields required for synchronisation and auditing.
4. Do not add task statuses.
5. Do not add task categories.
6. Do not add priority fields.
7. Do not add assignments.
8. Do not add handover fields.
9. Do not add follow-up fields.
10. Do not add reporting fields.
11. Do not add extra required fields without approval.
12. Title and description must be editable only by the creator.
13. Created By and Date Created must not be editable.
14. Use server time as the authoritative timestamp after synchronisation.
15. Preserve the original device timestamp for offline-created records.

## 7. Inventory Record Rules

1. The initial inventory model must remain minimal.
2. An inventory record must include:

```text
Item Name
Item Location
Created By
Date Created
```

3. Do not add quantity tracking.
4. Do not add condition tracking.
5. Do not add status tracking.
6. Do not add depot structures.
7. Do not add asset assignment unless approved later.
8. Any user may create an inventory record.
9. Only the creator may edit or archive the record.
10. Created By and Date Created must not be editable.
11. Additional inventory fields may only be added after approval.

## 8. Search Rules

1. Provide one global search for tasks and inventory.
2. Search must support partial-word matching.
3. Search must work against locally cached records while offline.
4. Search results must clearly identify whether the result is a task or inventory record.
5. Search active records by default.
6. Archived records must not appear in normal search unless the user explicitly searches Archives.
7. Search should be case-insensitive.
8. Search must avoid exposing records that have been permanently deleted.
9. Keep the initial search implementation simple and predictable.
10. Do not add advanced search, saved filters, reporting, or AI search without approval.

## 9. Archive and Deletion Rules

1. Normal deletion must be implemented as an archive action.
2. Archiving must not physically delete the database record.
3. Archived records must disappear from normal active views.
4. Archived records must remain visible in an Archives area.
5. Archive metadata must include:

```text
Archived Status
Archived Date
Archived By
```

6. Only the creator may archive their record.
7. Archived records must retain all original content and ownership information.
8. Archived attachments must remain available unless permanently deleted.
9. Permanent deletion must only be available from Archives.
10. Permanent deletion must require an explicit confirmation.
11. Permanent deletion must clearly warn that the action cannot be undone.
12. Permanent deletion must remove associated stored attachments.
13. Permanent deletion must be synchronised to all cached devices.
14. Keep a minimal deletion audit record where technically practical.
15. Do not automatically purge archived records.
16. Do not permanently delete records because of sync errors.

## 10. Attachment Rules

1. Support attachments for task records and inventory records where required.
2. Users should be able to select files from device storage.
3. Users should be able to capture photos using the device camera where supported.
4. Attachments may include photos, screenshots, PDFs, documents, and other approved files.
5. Follow the company’s existing approved attachment storage procedures.
6. Do not use public cloud storage.
7. Do not store attachments directly inside the React source code or public web directory.
8. Store attachment metadata in SQL Server.
9. Store the actual file using the approved internal file-storage process.
10. Attachment metadata should include:

```text
Attachment ID
Parent Record ID
Parent Record Type
Original Filename
Stored Filename
File Type
File Size
Uploaded By
Created Date
Sync Status
Internal Storage Reference
```

11. Offline attachments must be stored temporarily in IndexedDB until synchronisation succeeds.
12. Never mark an attachment as uploaded until the server confirms receipt.
13. Keep failed attachment uploads available for retry.
14. Warn users before removing an unsynchronised attachment.
15. Do not silently compress, rename, convert, or alter uploaded files.
16. Generate safe stored filenames rather than trusting the original filename.
17. Prevent path traversal and unsafe filename handling.
18. Validate file size and file type on both frontend and backend.
19. Final file-size limits and prohibited file types must be configurable.
20. Do not execute or preview unsafe executable content.

## 11. Synchronisation and Conflict Rules

1. Every record must use a globally unique identifier.
2. Generate IDs on the client so records can be created offline.
3. Prefer UUIDs for record and attachment identifiers.
4. Do not rely on temporary numeric IDs for offline-created records.
5. Store a local version and server version for synchronised records.
6. Track the last modified timestamp.
7. Track the last successful server synchronisation.
8. Do not use last-write-wins silently when a conflict is detected.
9. If a server record changed since the device last synchronised, preserve both versions.
10. Mark the record as having a conflict.
11. Do not overwrite server data automatically during a conflict.
12. Do not discard the local version during a conflict.
13. Provide enough information for the user to review the two versions.
14. Sync operations must be idempotent.
15. Repeating the same sync request must not create duplicate records.
16. The server must safely handle retry requests.
17. Use transactions for related database changes where appropriate.
18. Sync records before large attachments where practical.
19. Keep attachment upload state separate from record sync state.
20. Log synchronisation failures without recording sensitive file contents.

## 12. API Rules

1. Use a clearly versioned internal API.
2. Keep API routes consistent and predictable.
3. Validate all request data on the server.
4. Never trust ownership values supplied by the frontend without verification.
5. Do not expose SQL Server connection details to the browser.
6. Do not return unnecessary database fields.
7. Use consistent API response structures.
8. Return clear error messages suitable for troubleshooting.
9. Do not expose stack traces or database errors to end users.
10. Use appropriate HTTP methods and response codes.
11. Protect against duplicate offline submissions.
12. Use parameterised queries or a safe ORM.
13. Never build SQL queries through string concatenation.
14. Apply server-side limits to attachment uploads.
15. Add health-check endpoints only if they do not expose sensitive information.

## 13. Database Rules

1. Use Microsoft SQL Server as the central database.
2. Use clear table and column names.
3. Use migrations or version-controlled database scripts.
4. Never make undocumented manual production database changes.
5. Use immutable unique IDs for users and records.
6. Store dates in a consistent UTC format.
7. Convert timestamps to local time only for display.
8. Preserve original offline creation timestamps separately where needed.
9. Use soft-delete or archive fields for normal record removal.
10. Use foreign keys where appropriate.
11. Add indexes only where they support real search or synchronisation needs.
12. Avoid premature database optimisation.
13. Do not store application secrets in database scripts.
14. Do not store file contents in SQL Server unless the approved storage procedure requires it.
15. Backward-compatible database changes are preferred.
16. Database changes must include rollback or recovery notes where practical.

## 14. PWA Rules

1. The app must be installable as a PWA.
2. Include a valid web app manifest.
3. Include suitable application icons.
4. Use a service worker for offline caching.
5. Cache only the assets needed for reliable offline operation.
6. Do not cache sensitive API responses indiscriminately.
7. Use versioned caches.
8. Remove outdated caches safely after a new release.
9. Do not break the offline app when deploying a new version.
10. Notify users when a new application version is available.
11. Avoid forcing an update while unsynchronised work exists.
12. Test PWA installation on supported desktop browsers and iOS Safari.
13. Do not assume all PWA features behave identically on iOS and desktop browsers.
14. Provide fallback behaviour for unsupported browser features.

## 15. React and TypeScript Rules

1. Use functional React components.
2. Use TypeScript types for records, API responses, sync operations, and component props.
3. Avoid the `any` type unless there is a documented reason.
4. Keep components focused and reasonably small.
5. Separate presentation, data access, synchronisation, and business logic.
6. Do not place SQL or backend logic in React components.
7. Use reusable components where genuine repetition exists.
8. Avoid creating abstractions for code used only once.
9. Use clear state management appropriate for the small application.
10. Do not introduce a complex global state library unless required.
11. Handle loading, offline, empty, error, and sync states explicitly.
12. Show user-friendly errors.
13. Log technical details separately for troubleshooting.
14. Validate forms before adding operations to the sync queue.
15. Prevent accidental double submissions.
16. Do not use browser alerts as the main interface except for simple unavoidable confirmations.
17. Keep mobile layouts touch-friendly.
18. Avoid relying on hover-only controls.
19. Ensure forms work with iOS keyboards and mobile screen sizes.
20. Keep the interface responsive without building separate desktop and mobile applications.
21. Follow the approved Tasty Fresh digital palette: red and cream primary, with navy, light blue, orange, and brown as support colours.
22. Use locally bundled Barlow for the web interface and Barlow Condensed for interface headings.
23. Do not load production fonts, branding, or UI assets from a public CDN.
24. Do not recreate or alter the official Tasty Fresh logo; use only an approved supplied asset.
25. Keep user-entered task and inventory content in its original case even when interface headings are uppercase.

## 16. Security Rules

1. Never store passwords, secrets, API keys, or connection strings in source code.
2. Use environment variables or approved server configuration.
3. Do not commit `.env` files containing secrets.
4. Provide an example environment file containing placeholder values only.
5. Never expose SQL credentials to the frontend.
6. Sanitize and validate all user input.
7. Escape output to reduce cross-site scripting risk.
8. Validate uploaded filenames and file content where practical.
9. Protect against path traversal.
10. Protect against SQL injection.
11. Use HTTPS for the production URL.
12. Do not claim the app is securely authenticated because users select a name.
13. Do not store passwords, licence keys, secrets, or sensitive credentials in diary records.
14. Do not log sensitive attachment contents.
15. Do not expose internal server paths in normal API responses.
16. Restrict production access using approved company network or domain controls.
17. Document any security limitation caused by the lack of authentication.

## 17. Error Handling Rules

1. Handle expected errors without crashing the application.
2. Preserve unsynchronised data after an error.
3. Display clear recovery actions where possible.
4. Distinguish between:

```text
Offline
Server Unavailable
Validation Error
Sync Failure
Attachment Failure
Conflict
Unexpected Error
```

5. Do not show raw stack traces to users.
6. Log enough technical detail to diagnose failures.
7. Do not repeatedly retry in a tight loop.
8. Use controlled retry delays.
9. Allow the user to manually retry failed operations.
10. Never delete queued data because an API request timed out.

## 18. Testing Rules

1. Test all creator-only edit and archive restrictions.
2. Test backend ownership validation independently of the frontend.
3. Test task creation while online.
4. Test task creation while offline.
5. Test inventory creation while online.
6. Test inventory creation while offline.
7. Test app restart with pending unsynchronised records.
8. Test reconnecting and synchronising pending records.
9. Test duplicate retry protection.
10. Test partial-word search.
11. Test search while offline.
12. Test archive and permanent deletion.
13. Test attachment capture and upload.
14. Test failed attachment uploads and retries.
15. Test conflict detection.
16. Test switching users with pending changes.
17. Test PWA installation and offline launch.
18. Test desktop browser behaviour.
19. Test iOS Safari and installed PWA behaviour.
20. Add automated tests for critical synchronisation and ownership logic.
21. Do not mark a feature complete until its failure cases have been tested.

## 19. Git and GitHub Rules

1. GitHub is the source of truth for application code and documentation.
2. Commit working changes regularly.
3. Create a commit after each meaningful completed change.
4. Do not combine unrelated changes in one commit.
5. Use clear commit messages.
6. Example commit messages:

```text
feat: add offline task creation
fix: prevent users editing records they do not own
feat: add inventory partial search
fix: retry failed attachment uploads
docs: update offline sync rules
```

7. Do not commit generated build folders unless the deployment process requires them.
8. Do not commit secrets, local databases, temporary files, or user uploads.
9. Keep `.gitignore` current.
10. Create a branch for substantial or risky changes.
11. Keep pull requests focused.
12. Explain database or architecture changes in the pull request.
13. Do not force-push shared branches without approval.
14. Tag stable internal releases.
15. Keep release and rollback notes for production deployments.
16. Update documentation in the same change as affected behaviour.

## 20. GitHub Copilot and Coding Bot Rules

1. Copilot-generated code must be reviewed before acceptance.
2. Do not assume generated code is correct.
3. Verify that generated code matches the approved requirements.
4. Do not allow the bot to invent missing business rules.
5. Do not allow the bot to silently add features.
6. The bot must explain any new dependency before adding it.
7. The bot must explain any major architecture change before implementing it.
8. The bot must preserve existing working behaviour.
9. The bot must not remove code merely because it prefers another style.
10. The bot must provide complete file paths when instructing where code belongs.
11. The bot must provide full replacement code when partial snippets would be unsafe or confusing.
12. The bot must identify whether a command is for PowerShell, Command Prompt, SQL, or another shell.
13. The bot must not assume packages or server components are already installed.
14. The bot must stop and report when required infrastructure information is unknown.
15. The bot must not fabricate internal server names, file paths, credentials, or configuration.
16. The bot must not claim a feature works until it has been tested or verified.
17. The bot must update relevant documentation when implementing a feature.
18. The bot must keep code readable for a beginner developer.
19. The bot must add comments only where they explain non-obvious logic.
20. The bot must not fill files with unnecessary comments.
21. The bot must not produce placeholder implementations and describe them as complete.
22. The bot must state clearly when code is an example, prototype, or production-ready implementation.
23. The bot must not make destructive changes without warning.
24. Before destructive database or file operations, the bot must provide a backup or rollback step.
25. The bot must follow this rules document over general coding preferences.

## 21. Dependency Rules

1. Minimise the number of third-party dependencies.
2. Prefer well-maintained and widely used packages.
3. Do not add a package when the required behaviour can be implemented simply with existing tools.
4. Explain the purpose of each new dependency.
5. Check package compatibility with the existing project.
6. Avoid abandoned or deprecated packages.
7. Do not add overlapping packages that solve the same problem.
8. Lock dependency versions through the project package-lock file.
9. Review major dependency upgrades before applying them.
10. Do not automatically update all packages during unrelated work.
11. Document any package that is critical to offline storage or synchronisation.

## 22. Documentation Rules

1. Keep a current `README.md`.
2. Document local development setup.
3. Document production configuration.
4. Document required environment variables.
5. Document database setup and migrations.
6. Document the offline synchronisation process.
7. Document attachment storage behaviour.
8. Document deployment and rollback steps.
9. Document known limitations.
10. Document the absence of secure authentication.
11. Update the app specification when requirements change.
12. Do not leave obsolete instructions in the documentation.
13. Add troubleshooting notes for common development and sync failures.
14. Keep `DocumentationPolicy.md`, `Architecture.md`, and `Operations.md` current.
15. Distinguish local implementation, internal integration verification, and production readiness.
16. Treat company-wide infrastructure and SQL documents as contextual unless explicitly adopted for this project.

## 23. Feature Scope Rules

1. Build only the currently approved functionality.
2. Do not add task statuses.
3. Do not add task categories.
4. Do not add handovers.
5. Do not add notifications.
6. Do not add reminders.
7. Do not add reporting.
8. Do not add exports.
9. Do not add external integrations.
10. Do not add quantity tracking.
11. Do not add inventory condition or status.
12. Do not add native iOS code.
13. Do not add Microsoft Azure dependencies.
14. Do not add conventional login authentication unless the requirements change.
15. Future features may be discussed, but they must not be implemented without approval.

## 24. Completion Rules

A feature may only be considered complete when:

1. The code builds successfully.
2. The feature matches the approved requirements.
3. Online behaviour has been tested.
4. Offline behaviour has been tested where applicable.
5. Synchronisation has been tested where applicable.
6. Ownership restrictions have been tested.
7. Error states have been handled.
8. Mobile behaviour has been checked.
9. Relevant automated tests pass.
10. Documentation has been updated.
11. The code has been committed to GitHub.
12. No secrets, temporary files, or user attachments have been committed.