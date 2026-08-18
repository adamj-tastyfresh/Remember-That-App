# Remember That documentation policy

This policy defines which documents control development when company-wide references and Remember That requirements differ.

## Source priority

Use the first applicable source in this order:

1. An explicit approved decision for Remember That recorded in `ReadMe.md`.
2. `DevelopmentRules.md`.
3. `Architecture.md`, `Synchronisation.md`, `Operations.md`, and the frontend/backend READMEs.
4. `TastyFresh_AI_StyleGuide.md` for visual identity and brand tone.
5. `Tasty Fresh Mobile App Development Standards.docx` for compatible quality, startup, caching, error-handling, and documentation practices.
6. Company-wide SQL, API, regional database, infrastructure, and business-logic documents as contextual references only.

A lower-priority reference must not silently override a higher-priority project decision.

## Explicit project overrides

| Company-wide default | Remember That decision |
|---|---|
| Expo Managed Workflow and React Native | React and TypeScript Progressive Web App |
| Token-based login and session restoration | Device-persistent name selection for identification only; no secure authentication |
| Unified stored-procedure gateway | Dedicated versioned Express API under `/api/v1` |
| Regional operational databases | Dedicated `RememberThat` SQL Server database |
| Cloud or generic attachment storage | Approved Tasty Fresh internal file storage only; integration remains disabled until supplied |

## Adopted company standards

Remember That adopts the following compatible standards:

- Friendly, reliable, and honest language
- Tasty Fresh red and cream as primary colours
- Navy, light blue, orange, and brown as supporting colours
- Locally bundled Barlow typography for the PWA
- Fast startup using local data first and background refresh where possible
- Typed, serialisable, separately scoped state
- Defensive API validation and null-safe error handling
- Explicit loading, empty, offline, error, and retry states
- No hardcoded secrets or environment-specific production values
- User-controlled PWA updates that do not silently interrupt queued work
- Architecture, startup, state, configuration, limitation, and handover documentation

## Reference-document handling

Company infrastructure, regional schemas, email procedures, internal network details, and unrelated business logic should normally live in a restricted company documentation repository rather than this application repository.

Before adding any such reference to Git:

1. Confirm it is required to build or operate Remember That.
2. Remove obsolete or duplicate versions.
3. Check for internal IP addresses, server names, paths, contacts, credentials, or operational details.
4. Add a scope statement explaining whether it is binding or contextual.
5. Obtain approval before committing sensitive internal material.

## Status language

Use these terms consistently:

- **Implemented locally:** code exists and automated local checks pass.
- **Integration verified:** the feature has been exercised against the approved internal service.
- **Production ready:** deployment, rollback, monitoring, security, and supported-device checks are complete.

Do not use “complete” or “production ready” when only local implementation has been verified.
