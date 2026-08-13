# Remember That frontend

React and TypeScript Progressive Web App for the Tasty Fresh IT task diary and inventory location tracker.

## Current milestone

The stock Vite demo has been replaced with:

- A responsive desktop sidebar and mobile bottom navigation shell
- First-run selection for Doug, Daniel, Mary, Adam, or Jabbar
- Stable internal IDs kept separate from display names
- Device-persistent user selection
- An always-visible user switcher

The user selection identifies record ownership only. It is not secure authentication.

The selected internal user ID is stored as the small device preference
`remember-that.current-user-id` in local storage. Application records will use
IndexedDB when offline data is introduced in a later milestone.

## Development

```powershell
npm install
npm run dev
```

## Checks

```powershell
npm run lint
npm run build
```

The production build includes the configured PWA service worker and web app
manifest.