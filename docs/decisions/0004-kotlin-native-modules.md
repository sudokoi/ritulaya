# 0004: Kotlin native modules for sync, crypto, logging, and widget

Date: 2026-08-12

Status: Accepted

## Context

The app needs several capabilities that touch Android platform APIs:

1. **Sync**: GitHub REST API calls (OAuth, Git Trees, file CRUD), CSV parsing, merge logic, background scheduling.
2. **Crypto**: Hardware-backed encryption key generation and management via Android Keystore.
3. **Logging**: Structured debug logging that survives JS crashes, with auto-pruning.
4. **Widget**: Android home screen widget showing cycle day and countdown.

The reference project (expense-buddy) implements sync in JavaScript (~2500 lines of services) with native modules for SMS and logging only. We considered doing the same.

## Decision

Implement the full sync pipeline in Kotlin (`ritulaya-sync`), along with separate native modules for crypto (`ritulaya-crypto`), logging (`ritulaya-logger`), widget (`ritulaya-widget`), persistence (`ritulaya-db`), and prediction (`ritulaya-predictions`). ~1,800 lines of Kotlin total across 6 modules.

## Consequences

- **Positive:** Consolidates background sync and foreground sync into one module — the `SyncWorker` (WorkManager) delegates to the same `SyncOrchestrator` that foreground triggers call. No code duplication.
- **Positive:** JS side becomes dramatically simpler — a thin bridge (~60 lines) that listens for events and passes config. No papaparse dependency, no XState sync machines, no merge engine in JS.
- **Positive:** CSV parsing in Kotlin avoids papaparse (a JS dependency) and is faster for large datasets (though our 2-file format makes this academic).
- **Positive:** Native WorkManager scheduling is more reliable than JS-based alternatives for background sync.
- **Positive:** `ritulaya-crypto` keeps the encryption key entirely in Android Keystore (TEE). JS never sees the raw key — only an opaque handle.
- **Negative:** More Kotlin code to maintain compared to JS-only sync. The sync pipeline is the largest module (~800 lines).
- **Negative:** Testing the sync pipeline requires Android instrumentation tests or manual testing on device. JS unit tests can't exercise it directly.
- **Negative:** GitHub API changes require Kotlin code changes, not JS. The developer maintaining sync must be comfortable in both languages.

### Module Breakdown

| Module            | Lines (Kotlin) | Purpose                                                                               |
| ----------------- | -------------- | ------------------------------------------------------------------------------------- |
| `ritulaya-sync`   | ~800           | GitHub OAuth, API client, CSV handler, merge engine, orchestrator, WorkManager worker |
| `ritulaya-db`     | ~300           | Room + SQLCipher persistence, typed facade used by app, sync, and predictions         |
| `ritulaya-predictions` | ~150       | Pure-Kotlin prediction engine (WMA + period length) with a thin bridge                |
| `ritulaya-crypto` | ~80            | Keystore key generation (consumed directly by `ritulaya-db`, no JS bridge)             |
| `ritulaya-logger` | ~120           | Room DB logger with 1000-entry cap, auto-prune                                        |
| `ritulaya-widget` | ~100           | AppWidgetProvider, cycle data display                                                 |
