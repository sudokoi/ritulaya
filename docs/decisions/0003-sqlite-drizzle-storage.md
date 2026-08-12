# 0003: SQLite + Drizzle ORM for local data storage

Date: 2026-08-12

Status: Accepted

## Context

We need a local persistence layer for period tracking data. The data is relational: cycles contain many day-logs, settings is a singleton, and sync metadata tracks remote state.

Options considered:

- **react-native-mmkv + AsyncStorage** (used by expense-buddy): Key-value store, fast, simple. But no query capabilities, no relational integrity, no migrations.
- **expo-sqlite + Drizzle ORM**: SQL database with type-safe queries, schema migrations, relational integrity. Used by bluma-app (a privacy-focused period tracker).
- **WatermelonDB**: Built on SQLite, lazy-loading, sync primitives. But ties us to its sync protocol, not GitHub sync.
- **Realm**: Deprecated by MongoDB for React Native.

## Decision

Use expo-sqlite with Drizzle ORM. Encrypt the database with SQLCipher, with the encryption key managed by the `ritulaya-crypto` native module (Android Keystore, hardware-backed).

## Consequences

- **Positive:** Relational model fits our data well — cycles → day-logs, settings singleton.
- **Positive:** Drizzle provides type-safe queries, schema migrations, and a familiar SQL-like API.
- **Positive:** SQLCipher (AES-256 page-level encryption) ensures data at rest is protected even on rooted devices.
- **Positive:** Database files can be exported for backup/sync without conversion.
- **Positive:** SQL queries make the insights screen (averages, trends, symptom frequency) straightforward.
- **Negative:** More setup than MMKV — schema definition, migration management. Worth it for the data model complexity.
- **Negative:** SQLCipher requires native key management. This is handled by our `ritulaya-crypto` module.
