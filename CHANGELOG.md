# ritulaya

## 0.2.0

### Minor Changes

- bd056bb: - Add on-device entry history with note search and inclusive date, symptom, and
  mood filters. Editing refreshes results without resetting filters; queries stay
  in memory, accessible results include context, and discreet previews hide details.
  - Refresh Today, Calendar, History, Settings, and the shared editor with consistent
    light/dark themes, readable estimates, centered statistics and controls, and
    direct logging actions. Keep tabs free of press animation. Improve keyboard
    visibility, retain collapsed tracking fields and failed drafts, and update dates
    when switching among the six supported locales. Explain missing cycle data
    without fabricated Calendar, reminder, or widget predictions; calculate cycle
    days using local dates and refresh Today's entry selection after midnight.
  - Save entries through one native transaction using persisted flow. Preserve
    existing fields and cycle associations during period fill; clear flow without
    overwriting other fields. All editors await shared persistence/refresh commands.
  - Add explicit Yes, No and Not recorded activity choices. Preserve existing No
    values during migration; new entries remain unrecorded. Replace implicit clear
    sentinels with named field intent and keep partial writes transactional.
  - Reconcile cycle boundaries and entry associations after flow edits/deletions,
    including backdated merges and splits. Add a before/after historical repair
    preview requiring confirmation; changed data invalidates the inspected preview.
  - Publish cycles, entries, settings and predictions as one coherent cache version.
    Capture inputs together in native storage, discard superseded refresh results,
    and retain the previous complete snapshot if loading or prediction fails.
  - Hide Insights health summaries and History search/filter details in discreet
    mode, while deliberately opened entries remain editable. Localize Insights
    dates and make setup controls wrap at large text sizes with 48dp actions.
  - Align exact Expo SDK 57 package pins with its recommended patch matrix and
    React Native 0.86.3; preserve NativeWind 4 and the existing native architecture.
    Enforce compatibility and Expo Doctor checks in CI without automatic upgrades.
  - Exclude private and device-protected app storage explicitly from Android cloud
    backups and device transfers, in addition to disabling automatic backup.
  - Fix the native logging bridge returning a coroutine job instead of completing
    its write; diagnostic failures no longer create unhandled JS errors.
  - Export useful, allowlisted local diagnostic context and app/Android versions.
    Filter new log writes and historical exports; omit raw errors, stacks, health
    fields, repository details and credentials. Reports remain user-initiated.
  - Remove cycle-day and countdown details from private widgets and replace failed
    widget updates with neutral content. Keep privacy blocks owned by the pending
    app operation rather than releasing them during unrelated background sync.
  - Coordinate reminder registration and privacy/language changes natively. Reject
    stale requests and await cancellation of scheduled and delivered notifications
    before installing changed policy, even when JS is suspended or cancelled.
  - Gate protected routes on successful initialization, reject missing prediction
    results and stale authentication successes after backgrounding, remove the
    unauthenticated lock bypass, prevent widget/prediction feedback, and request notification
    permission only when enabling reminders. Guard pending settings writes, separate
    cycle-length editing from seeding, and disable Android automatic backup.
  - Protect Android screenshots, recordings and recent-app previews when biometric
    lock or discreet mode is enabled. Keep routes hidden until the native window
    policy is applied, and offer a fail-closed retry if it cannot be applied.
  - Replace timestamp-based sync with local revisions, three-way merging, explicit
    conflict review, atomic Git publication, and restart-safe recovery. Migrate old
    repository data only after confirmation, into readable root-level
    `ritulaya-sync-*.json` files; remove legacy sync files in the same atomic commit,
    preserving unrelated files and Git history. Store versions in the manifest;
    keep biometric policy local. Retain deletion records, validate inputs, and retry
    transient failures. Export all tracking fields and correct accumulated counts.

  **Upgrade:** requires a rebuilt Android app for the new native command, not a
  JS-only update. The local database migrates existing records and adds sync state.
  Upgrade all syncing devices: confirmed migration deletes the legacy sync files
  from the branch, and older apps are unsupported afterward. Existing cycle history is not
  automatically repaired. GitHub data remains human-readable plaintext by design;
  on-device SQLCipher encryption is retained. CSV exports are not a complete
  settings/restore archive.

## 0.1.2

### Patch Changes

- 613af01: fix sync, calendar and build polish

  - Fix GitHub Sync failing on Play Store builds
  - Fix calendar today highlight and week strip selection
  - Fix Android build failing after dependency upgrade
  - Show correct app version in Settings and fix type and expo-doctor checks

## 0.1.1

### Patch Changes

- 96f952d: fix: deepen today/calendar seams and polish interactions

  - Correct Today card rendering to use locale labels for symptoms and moods (tender_breasts → Tender Breasts) via a shared display seam
  - Make Today flow dots and week strip tappable and share a single CycleStrip/DayEditor seam; TodayCard and Calendar now open the same DayDetailSheet
  - Add calendar Today affordance to jump back to the current month when navigated away
  - Fix DayDetailSheet Save button vertical centering and extract a unified Button primitive

## 0.1.0

### Minor Changes

- 4279c34: Localization across six locales

  - Full translations for en-US, en-GB, en-IN, hi, ja, and ko, with a language picker (including system default) in Settings
  - All user-facing strings moved into translation files, including discreet-mode label pairs and notification copy
  - Locales bundle statically; the stored language setting resolves against device languages with legacy "en" migration
  - Type-safe translation keys derived from the en-US source of truth

- 0e81792: Initial release of Ritulaya

  - Privacy-first period tracker for Android with SQLCipher-encrypted local storage
  - Optional GitHub sync with background WorkManager scheduling and conflict merge
  - Phase-aware UI, cycle predictions, and a home-screen widget

- f92864b: Prediction engine v2, widget theming, and live sync status

  - Predictions weight each cycle by recency and similarity to the user's own typical pattern (median/MAD), so irregular cycles damp out without discarding data or using population heuristics
  - Confidence now reflects both history volume and regularity; predictions expose an ~80% uncertainty window around the next period start
  - History older than 90 days resets predictions to population defaults
  - Phase boundaries derive from the user's configured period and luteal lengths instead of hardcoded day thresholds
  - The home-screen widget renders the app's persisted prediction snapshot (no more widget/app divergence) and follows the system light/dark theme
  - Sync status is a real state machine persisted through background syncs, with live updates in the app while it's open

- 1a5ec7d: Day entry fields, cycle seeding, and richer insights

  - Day entries now support cervical mucus, basal body temperature, and sexual activity, with a single canonical day-entry shape shared by the sheet, screens, and domain layer
  - New seed-cycle flow: plant your last period plus typical lengths at first run (or adjust later from Settings) so predictions work immediately
  - The home-screen widget deep-links straight into logging today's entry
  - Calendar shades uncertainty-window days as "maybe" alongside predicted days; Today softens its copy when prediction confidence is low
  - Insights gains a Cycle Lengths history card with regularity summary and a By Phase view grouping symptoms and moods by cycle phase
  - A daily discreet-aware nudge replaces the period-ahead reminder while a period is overdue

### Patch Changes

- f41537a: Architecture: consolidate data refresh, sync auth, and native access

  - Route every reload through one data-refresh module that owns the dependency graph (cycles, day logs, settings) instead of each screen and the sync path hand-picking store subsets
  - Split GitHub device-flow auth into its own store so the sync store only owns repo, run, and status state
  - Centralize optional-native availability and fallback semantics in one adapter; the db, prediction, and sync services shrink to domain-shaped calls
  - Move the day-log period-transition rule off the calendar screen into a domain action
  - Add unit tests for the cycle-derivation recurrence, fertile ramp, and horizon clipping

- cf187b3: Restrict Android to arm64 and fix release-only failures

  - Restrict Android artifacts to arm64-v8a via expo-build-properties buildArchs so EAS emits single-ABI AABs/APKs
  - Bind i18next to react-i18next via initReactI18next and disable suspense so useTranslation resolves bundled resources instead of returning raw keys in release builds

- 894048d: Fix sync correctness, privacy, and UX issues found in a codebase audit

  - GitHub sync now fails loudly on API errors instead of reporting success, keeps writes made mid-sync from being wiped, and serializes concurrent sync runs
  - Sync conflicts resolve by recency instead of delete-always-wins; overdue periods no longer project a fertile window two weeks late
  - The OAuth token never crosses the JS bridge and device flow survives transient network outages
  - Exported CSVs are properly quoted and formula-injection safe, and temp export files are deleted after sharing
  - Reminders use a private lock-screen channel; sexual activity can be unset; background failures are logged instead of dropped
  - Accessibility roles/labels and 44px touch targets across interactive UI, keyboard handling in the day sheet and GitHub sync, repository-name validation, and calendar rendering performance improvements

- 36e5ae0: Prediction, theme, and interaction polish

  - Share cycle predictions across screens through a single store, computed once instead of per screen
  - Use one teal accent color for all primary actions, distinct from the cycle phase colors
  - Standardize touch interactions on Pressable with pressed-state feedback
  - Wrap period logging in a database transaction so it is applied atomically

- 6d1e912: Calendar, prediction, and day-marker improvements

  - Show period, fertile, and ovulation predictions for every month you view, not just the next period
  - Surface fertile and ovulation markers in the Today week strip
  - Replace day markers with gradient phase fills (full, translucent, and ramping circles); logged days keep a small dot
  - Fix negative "days until next period" when logging a period on a past date
  - Refresh Today's data when the app returns to the foreground after a background sync

- 74d5c25: Chronological cycle derivation and sync-restore fixes

  - Derive cycle boundaries from recorded flow dates instead of entry order, so a backdated period lands in the correct cycle
  - Fix the negative average-cycle length and the "every day predicted" markers caused by out-of-order periods
  - Replace the solid fertile fraction fill with a translucent full-circle gradient and a calmer palette
  - Restore synced settings on a fresh install instead of overwriting them with defaults

- a5c858b: Fixes and polish from a combined review of the four feature stacks

  - Sync: mid-sync edits and deletions now beat stale snapshot rows on both the upsert and delete paths; status payloads return `null` (never `"0"`) for never-synced, and an unauthenticated run reports idle instead of an error shape
  - Sync screen: renders the live status machine — status label and dot color, last-synced time, and a repeated-failure warning showing the failure count
  - Widget: display strings come from `locales/*.json` via the prediction snapshot (English fallback only when rendering from local computation), counters clamp at zero, language switches re-render immediately, and cold-starting from the deep link lands on Today instead of exiting
  - i18n: notification copy and the Android reminder channel follow language changes, remaining hardcoded alerts translated, `intl-pluralrules` polyfill imported, `expo-localization` pinned exact
  - Internals: phase boundaries defined once in the engine with a JS mirror guarded by a fixture test; day-log clear convention decoded in one pure tested function; widget staleness reads its version from the database itself; dead code removed

## 0.1.0-alpha.5

### Patch Changes

- cf187b3: Restrict Android to arm64 and fix release-only failures

  - Restrict Android artifacts to arm64-v8a via expo-build-properties buildArchs so EAS emits single-ABI AABs/APKs
  - Bind i18next to react-i18next via initReactI18next and disable suspense so useTranslation resolves bundled resources instead of returning raw keys in release builds

## 0.1.0-alpha.4

### Minor Changes

- 4279c34: Localization across six locales

  - Full translations for en-US, en-GB, en-IN, hi, ja, and ko, with a language picker (including system default) in Settings
  - All user-facing strings moved into translation files, including discreet-mode label pairs and notification copy
  - Locales bundle statically; the stored language setting resolves against device languages with legacy "en" migration
  - Type-safe translation keys derived from the en-US source of truth

- f92864b: Prediction engine v2, widget theming, and live sync status

  - Predictions weight each cycle by recency and similarity to the user's own typical pattern (median/MAD), so irregular cycles damp out without discarding data or using population heuristics
  - Confidence now reflects both history volume and regularity; predictions expose an ~80% uncertainty window around the next period start
  - History older than 90 days resets predictions to population defaults
  - Phase boundaries derive from the user's configured period and luteal lengths instead of hardcoded day thresholds
  - The home-screen widget renders the app's persisted prediction snapshot (no more widget/app divergence) and follows the system light/dark theme
  - Sync status is a real state machine persisted through background syncs, with live updates in the app while it's open

- 1a5ec7d: Day entry fields, cycle seeding, and richer insights

  - Day entries now support cervical mucus, basal body temperature, and sexual activity, with a single canonical day-entry shape shared by the sheet, screens, and domain layer
  - New seed-cycle flow: plant your last period plus typical lengths at first run (or adjust later from Settings) so predictions work immediately
  - The home-screen widget deep-links straight into logging today's entry
  - Calendar shades uncertainty-window days as "maybe" alongside predicted days; Today softens its copy when prediction confidence is low
  - Insights gains a Cycle Lengths history card with regularity summary and a By Phase view grouping symptoms and moods by cycle phase
  - A daily discreet-aware nudge replaces the period-ahead reminder while a period is overdue

### Patch Changes

- 894048d: Fix sync correctness, privacy, and UX issues found in a codebase audit

  - GitHub sync now fails loudly on API errors instead of reporting success, keeps writes made mid-sync from being wiped, and serializes concurrent sync runs
  - Sync conflicts resolve by recency instead of delete-always-wins; overdue periods no longer project a fertile window two weeks late
  - The OAuth token never crosses the JS bridge and device flow survives transient network outages
  - Exported CSVs are properly quoted and formula-injection safe, and temp export files are deleted after sharing
  - Reminders use a private lock-screen channel; sexual activity can be unset; background failures are logged instead of dropped
  - Accessibility roles/labels and 44px touch targets across interactive UI, keyboard handling in the day sheet and GitHub sync, repository-name validation, and calendar rendering performance improvements

- a5c858b: Fixes and polish from a combined review of the four feature stacks

  - Sync: mid-sync edits and deletions now beat stale snapshot rows on both the upsert and delete paths; status payloads return `null` (never `"0"`) for never-synced, and an unauthenticated run reports idle instead of an error shape
  - Sync screen: renders the live status machine — status label and dot color, last-synced time, and a repeated-failure warning showing the failure count
  - Widget: display strings come from `locales/*.json` via the prediction snapshot (English fallback only when rendering from local computation), counters clamp at zero, language switches re-render immediately, and cold-starting from the deep link lands on Today instead of exiting
  - i18n: notification copy and the Android reminder channel follow language changes, remaining hardcoded alerts translated, `intl-pluralrules` polyfill imported, `expo-localization` pinned exact
  - Internals: phase boundaries defined once in the engine with a JS mirror guarded by a fixture test; day-log clear convention decoded in one pure tested function; widget staleness reads its version from the database itself; dead code removed

## 0.1.0-alpha.3

### Patch Changes

- 74d5c25: Chronological cycle derivation and sync-restore fixes

  - Derive cycle boundaries from recorded flow dates instead of entry order, so a backdated period lands in the correct cycle
  - Fix the negative average-cycle length and the "every day predicted" markers caused by out-of-order periods
  - Replace the solid fertile fraction fill with a translucent full-circle gradient and a calmer palette
  - Restore synced settings on a fresh install instead of overwriting them with defaults

## 0.1.0-alpha.2

### Patch Changes

- f41537a: Architecture: consolidate data refresh, sync auth, and native access

  - Route every reload through one data-refresh module that owns the dependency graph (cycles, day logs, settings) instead of each screen and the sync path hand-picking store subsets
  - Split GitHub device-flow auth into its own store so the sync store only owns repo, run, and status state
  - Centralize optional-native availability and fallback semantics in one adapter; the db, prediction, and sync services shrink to domain-shaped calls
  - Move the day-log period-transition rule off the calendar screen into a domain action
  - Add unit tests for the cycle-derivation recurrence, fertile ramp, and horizon clipping

- 6d1e912: Calendar, prediction, and day-marker improvements

  - Show period, fertile, and ovulation predictions for every month you view, not just the next period
  - Surface fertile and ovulation markers in the Today week strip
  - Replace day markers with gradient phase fills (full, translucent, and ramping circles); logged days keep a small dot
  - Fix negative "days until next period" when logging a period on a past date
  - Refresh Today's data when the app returns to the foreground after a background sync

## 0.1.0-alpha.1

### Patch Changes

- 36e5ae0: Prediction, theme, and interaction polish

  - Share cycle predictions across screens through a single store, computed once instead of per screen
  - Use one teal accent color for all primary actions, distinct from the cycle phase colors
  - Standardize touch interactions on Pressable with pressed-state feedback
  - Wrap period logging in a database transaction so it is applied atomically

## 0.1.0-alpha.0

### Minor Changes

- 0e81792: Initial release of Ritulaya

  - Privacy-first period tracker for Android with SQLCipher-encrypted local storage
  - Optional GitHub sync with background WorkManager scheduling and conflict merge
  - Phase-aware UI, cycle predictions, and a home-screen widget
