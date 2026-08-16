---
"ritulaya": patch
---

Architecture: consolidate data refresh, sync auth, and native access

- Route every reload through one data-refresh module that owns the dependency graph (cycles, day logs, settings) instead of each screen and the sync path hand-picking store subsets
- Split GitHub device-flow auth into its own store so the sync store only owns repo, run, and status state
- Centralize optional-native availability and fallback semantics in one adapter; the db, prediction, and sync services shrink to domain-shaped calls
- Move the day-log period-transition rule off the calendar screen into a domain action
- Add unit tests for the cycle-derivation recurrence, fertile ramp, and horizon clipping
