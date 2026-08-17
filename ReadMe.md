# Remember That

Remember That is an internal Progressive Web App for the Tasty Fresh IT department.

The purpose of the app is to provide a simple shared memory system for the IT team so staff can quickly record what they have done, find previous work, and identify where IT-related inventory is stored.

The application is designed to be lightweight, simple to maintain, and usable from both desktop computers and iPhones.

---

## Purpose

The IT department regularly performs technical work that may need to be referenced later.

This can include:

- Troubleshooting
- Device configuration
- Software changes
- Network changes
- User support
- System maintenance
- Hardware work
- General IT operational tasks

Without a central record, important information can remain in individual staff members' memory or become difficult to locate later.

Remember That provides a shared internal place to record this information.

The app is intended to answer questions such as:

- Has this task already been done?
- Who performed this work?
- What was changed?
- What notes were recorded about it?
- Where is a particular IT item stored?
- Who created this record?
- When was this information entered?

---

# Users

Remember That is intended only for the Tasty Fresh IT department.

The initial users are:

- Doug
- Daniel
- Mary
- Adam
- Jabbar

All users have the same general level of access.

There is no administrator role in the initial version.

---

# User Identification

Remember That does not use traditional authentication.

There is:

- No username and password login
- No Microsoft authentication
- No Face ID
- No external identity provider

When opening the app, the user selects their name from a dropdown.

The selected user is remembered on the device.

The current user selection determines ownership of newly created records.

This system is intended as user identification rather than secure authentication.

The application must only be accessible within the approved Tasty Fresh company environment.

---

# Core Features

The application has two primary functions:

1. Task diary
2. Inventory location tracking

A global search allows users to search across both areas.

---

# Task Diary

The task diary provides a simple record of IT work.

The initial task structure intentionally contains only a small number of fields.

Each task contains:

- Title
- Description
- Created By
- Date Created

Additional technical fields may be stored internally for:

- Synchronisation
- Archiving
- Record ownership
- Version tracking
- Offline operation

The first version must remain simple.

Features such as statuses, priorities, categories, assignments, handovers, and reporting are not currently required.

---

# Task Ownership

Any user may view task records.

Only the person who created a task may:

- Edit the task
- Archive the task
- Permanently delete the task from Archives

Users cannot modify records created by another user.

The original creator must remain associated with the record permanently unless the record is permanently deleted.

---

# Inventory

The inventory section is intended to answer a simple question:

> Where is this item?

The initial inventory record contains:

- Item Name
- Item Location
- Created By
- Date Created

The application does not initially track:

- Quantity
- Condition
- Inventory status
- Assignment
- Depot hierarchy
- Warranty details
- Asset lifecycle information

These features may be introduced later if required.

---

# Inventory Ownership

Any user may create an inventory record.

Any user may view inventory records.

Only the creator of an inventory record may:

- Edit it
- Archive it
- Permanently delete it from Archives

---

# Search

Remember That provides one global search covering:

- Task records
- Inventory records

Search must support partial-word matching.

For example:

```text
File
```

may return a task containing:

```text
FileMaker
```

Searching:

```text
charg
```

may return an inventory item such as:

```text
iPhone Charger
```

Search must also work while the application is offline using locally stored records.

Archived records should not appear in normal search results.

---

# Progressive Web App

Remember That is not a native iOS application.

It is a Progressive Web App built using React.

The same application will be used on:

- Desktop computers
- Laptops
- iPhones
- Supported mobile browsers

The app should be installable on supported devices and behave similarly to a normal installed application.

---

# Offline-First Design

Offline operation is a core requirement.

The application must continue working when completely disconnected from all networks.

This includes situations where the device has:

- No internet connection
- No Wi-Fi
- No access to the company network
- No connection to the application server
- No connection to SQL Server

While offline, users should still be able to:

- Open the installed app
- View previously synchronised records
- Search local records
- Create tasks
- Create inventory records
- Edit records they own
- Archive records they own
- Add attachments
- See records waiting to synchronise

Local application data will be stored using browser-based persistent storage such as IndexedDB.

---

# Synchronisation

When network access becomes available, the app will synchronise local changes with the internal backend.

The expected data flow is:

```text
React Progressive Web App
        |
        v
Local IndexedDB Database
        |
        v
Synchronisation Queue
        |
        v
Internal Backend API
        |
        v
Microsoft SQL Server
```

Attachments follow the approved internal storage process.

The application must never lose unsynchronised data silently.

---

# Synchronisation Status

Records and attachments should expose a clear synchronisation state.

Supported states may include:

```text
Synced
Waiting to Sync
Synchronising
Sync Failed
Conflict Detected
```

Users should also be able to see the last successful synchronisation time.

Failed synchronisation operations must remain available for retry.

---

# Conflict Handling

The application must not silently overwrite conflicting information.

If a server record has changed since the local device last synchronised, the application should:

1. Preserve the server version
2. Preserve the local version
3. Mark the record as having a conflict
4. Allow the conflict to be reviewed

A simple last-write-wins approach should not be used where it could result in data loss.

---

# Archives

Remember That uses a two-stage deletion process.

## Stage 1 — Archive

When a user deletes a record through normal application controls, the record is archived.

Archived records:

- Disappear from normal views
- Disappear from normal search
- Remain stored in the database
- Remain associated with the original creator
- Remain available from the Archives section

Only the creator may archive their record.

---

## Stage 2 — Permanent Deletion

Archived records may later be permanently deleted.

Permanent deletion should only be available from Archives.

Permanent deletion must:

- Require explicit confirmation
- Remove the record from active storage
- Remove associated attachments
- Remove cached copies during synchronisation
- Prevent the record from appearing again

Where practical, a minimal deletion log should be retained.

---

# Attachments

Users should be able to attach files to supported records.

Examples include:

- Photos
- Screenshots
- PDFs
- Word documents
- Text files
- Other approved file types

Users should also be able to capture photos directly from supported mobile devices.

Attachment storage must follow the existing approved Tasty Fresh internal storage procedures.

The project must not introduce an external cloud storage service for attachments.

Attachment metadata may include:

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
Storage Reference
```

Attachments added while offline must remain stored locally until successfully synchronised.

---

# Camera and Device Storage

The Progressive Web App should support device capabilities where available.

The initial device requirements are:

- Camera access
- File selection from device storage

Face ID is not required.

Native iOS-only features should not be introduced unless the project requirements change.

---

# Application Architecture

The intended high-level architecture is:

```text
Desktop Browser
       |
       |
iPhone PWA
       |
       v
React Progressive Web App
       |
       +-- Service Worker
       |
       +-- IndexedDB
       |
       +-- Offline Sync Queue
       |
       v
Internal Backend API
       |
       +-- Microsoft SQL Server
       |
       +-- Approved Internal File Storage
```

The frontend must never connect directly to Microsoft SQL Server.

All central database operations must pass through the internal backend API.

---

# Database

Microsoft SQL Server is the central application database.

The database will store information including:

- Users
- Tasks
- Inventory records
- Attachment metadata
- Record ownership
- Creation dates
- Modification dates
- Archive information
- Synchronisation information
- Version information

The final schema will be documented separately.

---

# Hosting

The application will be hosted internally on existing Tasty Fresh infrastructure.

The production URL is:

```text
https://rememberthat.tastyfresh.com.au
```

The application must not depend on Microsoft Azure.

Application data must remain inside the company network.

There are restrictions on installing additional server software, so the project should use existing approved infrastructure wherever possible.

---

# Development Stack

The confirmed development environment is:

```text
Frontend: React
Language: TypeScript preferred
Application Type: Progressive Web App
Database: Microsoft SQL Server
Source Control: GitHub
Development Environment: Visual Studio Code
Primary Coding Assistant: GitHub Copilot
Hosting: Internal Windows infrastructure
```

The backend technology will be selected based on what can operate within the existing internal server environment.

---

# Development Philosophy

Remember That should remain deliberately simple.

The project is maintained primarily by a beginner developer, so code should prioritise:

- Readability
- Maintainability
- Clear naming
- Simple architecture
- Predictable behaviour
- Minimal dependencies
- Good documentation

Advanced patterns should not be introduced simply because they are considered more sophisticated.

The simplest reliable solution should normally be preferred.

---

# Source Control

GitHub is the source of truth for the project.

The repository should contain:

- Application source code
- Database scripts and migrations
- Documentation
- Configuration examples
- Deployment instructions
- Development notes
- Version history

Secrets, passwords, user uploads, production connection strings, and environment-specific credentials must never be committed.

---

# GitHub Copilot

GitHub Copilot will be the primary coding assistant during development.

Copilot-generated code must still be:

- Reviewed
- Understood
- Tested
- Verified against the project requirements

The coding assistant must not invent business requirements or implement unapproved functionality.

The project's coding rules should be followed before general coding preferences.

---

# Security Guidelines

Remember That is an internal application but should still follow basic secure-development practices.

The application must:

- Use HTTPS in production
- Keep SQL Server credentials on the server
- Never expose database credentials to the frontend
- Validate user input
- Use parameterised database operations
- Protect against SQL injection
- Protect against path traversal
- Validate attachment filenames
- Avoid exposing internal server paths
- Avoid exposing raw errors or stack traces to users
- Keep secrets out of source control

The lack of user authentication must be clearly documented as a known security limitation.

Selecting a name from a dropdown must not be described as secure authentication.

---

# Information That Must Not Be Stored

Remember That is an operational memory application.

It must not be used as a password or secrets manager.

Users must not intentionally store:

- Passwords
- API keys
- Authentication tokens
- Licence keys
- Private encryption keys
- Lock combinations
- Sensitive credentials
- Unnecessary personal information

Sensitive configuration information should remain in the company's approved secure systems.

---

# Data Retention

Normal deletion archives records rather than removing them.

This allows operational history to be retained.

Historical records should continue identifying the person who originally created them.

Permanent deletion is a separate action available through Archives.

Retention rules may be expanded later if required.

---

# Current Scope

The current project scope includes:

- Progressive Web App
- Desktop support
- iPhone support
- User selection
- Task diary
- Inventory location records
- Global search
- Partial-word search
- Attachments
- Camera access
- Offline operation
- Local storage
- Synchronisation
- Archives
- Permanent deletion
- Microsoft SQL Server
- Internal hosting

---

# Currently Out of Scope

The following features are not required at this stage:

- Traditional login authentication
- Administrator accounts
- Native iOS application
- Android native application
- Microsoft Azure
- Task statuses
- Task categories
- Task priorities
- Handover workflows
- Task assignments
- Follow-up workflows
- Inventory quantities
- Inventory conditions
- Inventory statuses
- Depot hierarchy
- Reporting
- Exports
- Push notifications
- Email notifications
- External integrations
- AI search
- Public access
- Public App Store distribution

These features may only be added if the project requirements are changed later.

---

# Future Development

Remember That is intended to evolve based on real use by the IT team.

Possible future functionality may include:

- Additional diary fields
- Additional inventory fields
- Notifications
- Comments
- Record timelines
- Improved search
- Reporting
- Inventory quantity tracking
- Dashboard improvements
- Additional auditing
- Improved user identification
- Authentication

Future functionality should not be implemented until the requirement has been discussed and approved.

---

# Project Guidelines

When developing Remember That:

1. Keep the application simple.
2. Do not invent new requirements.
3. Do not add unnecessary dependencies.
4. Do not replace working code without a clear reason.
5. Preserve offline functionality.
6. Protect unsynchronised data.
7. Keep task and inventory ownership rules intact.
8. Keep all central data inside the company environment.
9. Use GitHub for source control.
10. Keep documentation current.
11. Test desktop and iPhone behaviour.
12. Test offline and reconnect scenarios.
13. Review all generated code.
14. Never commit secrets.
15. Prefer maintainability over complexity.

---

# Project Status

Remember That is in active milestone development. The responsive PWA shell, persistent user selection, offline task diary, offline inventory tracking, synchronisation foundation, offline global search, permanent deletion, offline attachment foundation, and file/camera attachment controls are implemented.

Approved internal attachment storage integration, PWA lifecycle improvements, internal environment integration, and deployment remain future milestones. Conflict detection and side-by-side review remain in place, but a separate conflict-resolution milestone is not required.

This README should be updated whenever an approved project decision changes the expected behaviour or architecture of the application.
