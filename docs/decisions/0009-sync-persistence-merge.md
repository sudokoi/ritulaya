# 0009: Sync persistence and merge semantics

Date: 2026-08-14

Status: Superseded by ADR-0010

> Superseded by ADR-0010 on 2026-08-14: `LocalDataStore` was replaced by the
> shared `RitulayaDataStore` facade in `ritulaya-db`. The original decision below
> is historical. Current merge behavior compares edit and deletion timestamps;
> deletion wins ties, but an explicitly newer edit can restore a row.

> Hardening addendum (2026-09-05): remote tombstones are retained indefinitely,
> including on repeated syncs with no local row. There is no device registry or
> acknowledgement protocol that could prove all offline devices observed a
> deletion. Retention trades small CSV growth for protection against stale
> resurrection. Local pending tombstones may be acknowledged after upload;
> that does not remove the repository tombstone. Older app versions can still
> drop tombstones, so all syncing devices should upgrade. Plaintext CSV/JSON
> remains intentional and must not be encrypted by the application.

## Context

GitHub sync must both upload local changes and pull remote changes, including deletions, without a central server to arbitrate. The local database is SQLCipher-encrypted at rest (ADR-0003), and background sync runs without a JavaScript runtime (ADR-0004).

## Decision

The `ritulaya-sync` Kotlin module owns the whole sync pipeline. `SyncOrchestrator` fetches the remote CSVs, loads local rows, merges, writes the merged CSVs, pushes, and persists the result back to the local database.

- **Direct encrypted-DB access.** `LocalDataStore` opens the same SQLCipher database the app uses, via `android-database-sqlcipher` with the Keystore-wrapped key from `ritulaya-crypto`. Reads return plaintext (decrypted), writes re-encrypt on the way to disk. The GitHub copy is plaintext — encryption is at-rest only (ADR-0003), and sync is opt-in to the user's private repo.
- **Background and foreground sync share one code path.** The `WorkManager` `SyncWork` calls the same `SyncOrchestrator` that the foreground "Sync Now" button uses, so there is no duplicated merge logic.
- **Tombstones for deletions.** The app hard-deletes rows, so local deletes are recorded in a `sync_tombstones` table (`entity`, `entity_id`, `deleted_at`). `LocalDataStore` merges those tombstones into the local row set as rows with `deleted_at` set. On a successful push the tombstones are cleared.
- **Delete-always-wins.** `MergeEngine` resolves conflicts by `updated_at` (last-write-wins) except when either side is deleted: a tombstone always beats a live row. This avoids resurrecting rows a user deleted locally.

## Consequences

- **Positive:** One sync implementation for foreground and background.
- **Positive:** Local deletions propagate across devices via tombstones, which are consumed once every device has synced.
- **Positive:** The encrypted DB is never decrypted to a plaintext file — decryption happens only in memory on read.
- **Negative:** The sync module duplicates the SQLite schema (table/column names) in Kotlin. Schema changes must be mirrored in `LocalDataStore`.
- **Negative:** The Kotlin pipeline is only exercisable via instrumented/device tests; JS unit tests cannot reach it.
