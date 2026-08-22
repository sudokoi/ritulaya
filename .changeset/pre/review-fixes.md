---
"ritulaya": patch
---

Fixes and polish from a combined review of the four feature stacks

- Sync: mid-sync edits and deletions now beat stale snapshot rows on both the upsert and delete paths; status payloads return `null` (never `"0"`) for never-synced, and an unauthenticated run reports idle instead of an error shape
- Sync screen: renders the live status machine — status label and dot color, last-synced time, and a repeated-failure warning showing the failure count
- Widget: display strings come from `locales/*.json` via the prediction snapshot (English fallback only when rendering from local computation), counters clamp at zero, language switches re-render immediately, and cold-starting from the deep link lands on Today instead of exiting
- i18n: notification copy and the Android reminder channel follow language changes, remaining hardcoded alerts translated, `intl-pluralrules` polyfill imported, `expo-localization` pinned exact
- Internals: phase boundaries defined once in the engine with a JS mirror guarded by a fixture test; day-log clear convention decoded in one pure tested function; widget staleness reads its version from the database itself; dead code removed
