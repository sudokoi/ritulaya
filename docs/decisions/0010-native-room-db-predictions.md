# 0010: Native Room database and prediction modules

Date: 2026-08-14

Status: Accepted

## Context

ADR-0003 chose expo-sqlite + Drizzle ORM, with the JS layer owning query construction and migrations. In practice this produced a split-brain: the JS app wrote via expo-sqlite's bundled SQLCipher while `ritulaya-sync` opened the same file via `android-database-sqlcipher` — two SQLCipher stacks, two copies of the schema (Drizzle + a hand-mirrored `LocalDataStore`), and prediction logic duplicated across JS and Kotlin.

We wanted one point of access for the encrypted database, native background access (sync runs in WorkManager without a JS runtime), and a native home for the prediction engine ahead of future ML models.

## Decision

Move all persistence to a new `ritulaya-db` module: Room + KAPT + SQLCipher (`SupportFactory`), keyed by the Keystore-wrapped key from `ritulaya-crypto`. A `RitulayaDataStore` facade is the single access point used by the app bridge, `ritulaya-sync`, and a new `ritulaya-predictions` module.

- `ritulaya-db` owns the schema (Room entities byte-match the former Drizzle schema), the encrypted connection, and a typed facade. `ritulaya-sync`'s `LocalDataStore` is deleted; `SyncOrchestrator` consumes `RitulayaDataStore`.
- `ritulaya-predictions` is a pure-Kotlin prediction engine (`java.time`, no Android imports) plus a thin bridge. It is a pure function: cycles, logs, and config cross the seam from JS, and it returns the prediction, period length, average cycle length, and phase. It does not read the database.
- Delete the JS Drizzle layer, expo-sqlite, and the `withSQLCipher` plugin. The JS side becomes an async client over the bridge, with the JS↔native interface as the portability seam.
- Prediction tests move to JVM JUnit against the engine.

## Consequences

- **Positive:** One SQLCipher stack, one schema, one access point — no cross-stack key/journal-mode parity risk.
- **Positive:** Native background sync and future ML predictions share the same modules.
- **Positive:** Room gives type-safe entities, compile-time query checking, and a migration path (version 1 now).
- **Negative:** The JS layer loses synchronous queries — stores are now async, and prediction results cross the bridge as ISO strings.
- **Negative:** The data layer is Android-only; an iOS port would re-implement the bridge against its own store (the JS interface is the seam).
