# ritulaya

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
