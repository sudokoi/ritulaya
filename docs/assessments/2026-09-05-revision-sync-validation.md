# Revision sync — implementation and validation

Historical checkpoint: the later pre-release amendment to ADR-0012 replaces the
unshipped directory layout with flat files and deletes legacy files in the
confirmed migration commit. The results below describe the earlier layout.

This follow-up covers the sync replacement after `601cb5d`, not completion of the
entire [remaining hardening scope](../plans/2026-09-05-remaining-hardening.md).
The accepted protocol is [ADR-0012](../decisions/0012-revision-based-sync.md).

## Implemented

- Room v1→v2 preserves records and old No values, seeds transactional revision
  tracking, and moves biometric policy out of synchronized settings.
- Native three-way merge, date identity, persistent conflict/migration review,
  immutable remote reads, one Git commit, non-force publication and recovery.
- Late local edits defer the whole aggregate installation and retain a full
  captured local baseline for the next merge. Settings and deletion revisions
  cannot be acknowledged by an older attempt.
- Legacy CSV/JSON is imported only after approval; publication uses readable JSON
  under `ritulaya/v2/`, leaving old files unchanged. Once accepted, disappearance
  of v2 is rejected rather than silently re-importing stale legacy files.
- Localized review UI preserves failed choices, reports publication/retry errors,
  and hides conflict values in discreet mode until deliberately revealed.

## Independent review

Two read-only reviewers examined requirements and standards separately.

**Standards:** four findings addressed: privacy check before uploading objects,
exact manifest versions, regeneration of stale reviews, and localized conflict
labels/values. The reviewer confirmed all four fixes.

**Requirements:** five findings addressed: absence versus explicit deletion,
unsupported settings deletion, local entry-ID collisions, stale resolved attempts,
and hidden publication failures. Follow-up confirmed four completely, and found
a legacy-fallback variant of the first. That path now rejects loss of an accepted
v2 snapshot and has a regression test.

Additional codec round-trip coverage exposed omitted null fields in JSON object
construction. Encoding now writes explicit nulls for nullable record fields and
conflict records, preserving the strict schema rather than weakening validation.

## Evidence and limits

- JS/React: 138 tests across 25 suites passed, including explicit confirmation,
  conflict choice retention, publication failure and discreet review behavior.
- All 71 native tests passed: database 21, sync 32, authentication 4, predictions 14.
  Database and sync JVM tests cover application revision triggers, actual v1
  migration, late writes/deletes, field merges, absence/deletion, interrupted
  publication, competition, review freshness, codec compatibility and Git request
  contracts. These do not re-test Room/SQLCipher or Git's implementation guarantees.
- Final typecheck, ESLint/ktlint, formatting, whitespace checks and changeset
  status passed. One minor changeset remains.
- Final ARM64 release-mode APK build passed with the unchanged production package
  `com.sudokoi.ritulaya`. It uses the existing local debug signing configuration;
  this is build validation, not a publishable production-signed artifact. It was
  neither installed over the production app nor published.
- An isolated debug APK was built and installed over synthetic
  `com.sudokoi.ritulaya.qa` data. Startup after migration retained the September 5
  multiline note/flow, and the native-backed review route showed its empty state.
  This smoke test preceded the final review fixes, not end-to-end sync testing.
- Live GitHub testing and publication are prohibited by the maintainer. No test
  repository or credentials were created. Hermetic adapter tests do not establish
  live transport/authentication behavior. No production health data was accessed.
- The original app/package and unrelated port 8081 remain untouched. Physical
  Android 17/OEM checks and final production signing remain outside this evidence.

Historical cycle repair, tri-state entry semantics, coherent frontend cache
publication, app-wide capture/discreet policy and compatibility work remain
separate approved follow-ups; this document does not mark them complete.
