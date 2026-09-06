# 0012: Revision-based, restart-safe GitHub sync

Date: 2026-09-05

Status: Accepted

Amended 2026-09-06 before release: flat root files replace the unshipped
`ritulaya/v2/` layout, and confirmed migration deletes legacy sync files atomically.
The maintainer confirmed there are no users depending on that intermediate
layout and accepted the older-client compatibility trade-off. No compatibility
reader or migration for the intermediate directory is introduced.

## Context

The maintainer requested a coherent solution to lost updates, deletion
acknowledgement races, clock skew and partial GitHub publication. Wall-clock
timestamps cannot establish causality between offline devices. Per-call guards
alone do not provide a recoverable sync protocol.

## Decision

Keep Room/SQLCipher and the native sync module. Use a small persisted revision
ledger and encrypted sync journal, not a full event log or a hosted service.

- Database triggers advance local revisions and mark changed records pending in
  the transaction that changes them. Revisions are local concurrency tokens,
  never cross-device clocks. Tombstone revisions remain after acknowledgement.
- Biometric policy lives in a device-local table. The old settings column is
  retained as an inert migration compatibility detail and stored as zero; it is
  neither exported nor consulted for authentication after migration.
- Each repository ID and branch owns an accepted Git commit, its baseline data,
  a prepared attempt and any conflict review. These live in the encrypted DB.
- Three-way merge compares baseline/local/remote field values. Independent
  changes combine; same-field and edit/delete conflicts require explicit choices.
  Timestamps are metadata, never the conflict winner. Day-entry identity is the
  calendar date. Equivalent independently created cycle starts use one canonical
  internal ID; their fields still undergo conflict detection. Invalid historical
  duplicate starts or dangling references fail safely rather than being repaired
  without consent.
- Git reads use one immutable commit. A new tree preserves unrelated files and
  replaces all protocol files together. A commit with that parent is published
  with a non-force branch update. Competing commits cause a new read and merge.
- Persist the candidate commit, captured values and revisions before advancing
  the branch. After a crash, inspect ancestry to recognize publication and finish
  acknowledgement without guessing from timestamps. Never replay against an
  unrelated rewritten history.
- Local installation and baseline updates form one transaction. Cycle/entry
  relationships require a coherent snapshot: if any captured revision changed,
  defer installation of the entire snapshot. Retain the captured local values as
  a rebase baseline so later edits cannot accidentally undo unrelated remote
  changes on the next sync. This is separate from the exact accepted Git baseline.
- Resolution is tied to a review ID, remote commit and captured revisions. Data
  changes invalidate choices before publication. No review content enters logs.

## Migration and compatibility

Room v1→v2 preserves existing rows, imports the biometric preference into local
policy, and seeds pending revisions for records and legacy tombstones. There is
no destructive fallback or downgrade path.

After explicit confirmation, legacy root CSV/JSON files are converted to four
human-readable JSON files at the repository root:

```text
ritulaya-sync-manifest.json
ritulaya-sync-cycles.json
ritulaya-sync-day-logs.json
ritulaya-sync-settings.json
```

The manifest owns `protocolVersion`, `schemaVersion` and the exact data-file list.
Versions are not encoded in directory names or user settings. Missing, duplicate
or unexpected manifest file entries are rejected. Fresh repositories use the
same flat layout.

The confirmed migration's tree writes those files and deletes **only existing**
`ritulaya-cycles.csv`, `ritulaya-day-logs.csv`, `ritulaya-settings.json` and
`ritulaya.json`. The deletion entries use explicit null SHAs in that same tree,
not sequential Contents API deletions. The parent root tree must be complete and
the matched paths regular files; unrelated files and Git history are preserved.
Ordinary sync never repeats legacy cleanup. Migration approval stays bound to the
inspected head; if a legacy edit advances the branch, a fresh confirmation is
required before a new candidate can delete anything.

Record fields are strings or null; symptom
lists retain their JSON-array representation. A null record is a durable deletion.
Unknown legacy day IDs are retained as deletion aliases until they can be matched
to an entry date. Malformed, incomplete and unsupported snapshots stop sync.

### Entry-semantics follow-up

Room v2→v3 makes sexual activity nullable without reinterpreting any existing 0/1
value. The migration retains revision/checkpoint tables and reinstalls day-entry
triggers after rebuilding that table. New entries default to unrecorded. The
bridge uses named `clearFields` for explicit clears; omitted/null fields keep
stored data, and an empty symptom list clears symptoms.

Protocol 2 now writes schema 3, permitting null sexual activity. It still reads
schema 2 records with their recorded No/Yes values and imports legacy CSV without
changing those values. A schema-2-only client rejects schema 3 before merge or
publication, rather than silently interpreting unknown as No. Plaintext storage
is unchanged; both versions use the flat filenames above.

Legacy files are removed from the branch by migration but remain recoverable in
Git history. Older apps are unsupported after migration and may recreate their
legacy files; those writes are neither reimported nor automatically deleted by
the new client. All participating devices must upgrade. A first sync
has no invented common baseline; differing local/remote values require review.

## Consequences and checks

- Plaintext repository storage remains intentional. On-device data, baselines,
  attempts and conflicts remain SQLCipher encrypted. No accounts or telemetry.
- Files change atomically in Git, not across Git and SQLite. The durable journal
  and retry protocol bridge those two transactions.
- Pending revisions and retained tombstones consume space; no unsafe pruning
  assumes that every offline device has seen a deletion.
- Tests cover our revision triggers with replace-style writes, v1 migration data
  preservation, three-way merge, conflict freshness, late-edit rebasing, competing
  publication, crash recovery, Git request contracts and confirmation UI.
- Live GitHub testing requires explicit authorization and isolated synthetic
  data. The maintainer authorized one newly created private QA repository;
  [recorded evidence](../assessments/2026-09-06-live-github-sync.md) distinguishes
  live Android instrumentation from hermetic tests and production-release claims.

This replaces the timestamp-based merge implementation, rather than retaining a
second sync path. ADR-0008 describes the legacy root-file format; its filenames
remain readable for migration but are no longer the publication target.
