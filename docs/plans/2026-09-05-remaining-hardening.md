# Remaining hardening — approved scope

The maintainer requested all remaining findings from the final branch audit's
follow-up list be addressed. This extends the earlier bounded UI/hardening scope.

## Confirmed decisions

- Keep GitHub CSV/JSON human-readable plaintext and local SQLCipher encryption.
- Preserve the production package `com.sudokoi.ritulaya` and Android-only scope.
- Reconcile future entry edits; preview historical repairs and require explicit
  confirmation before changing existing cycle boundaries or associations.
- Add Yes/No/Not recorded sexual activity. Preserve existing No values; new
  entries default to Not recorded. Do not infer intent from old defaults.
- Protect Android capture/recent-app previews whenever biometric lock or discreet
  mode is enabled. Discreet overviews hide health information; deliberately
  opening an editor reveals that entry.
- Test application policies and boundary contracts, not guarantees provided by
  Room, SQLCipher, Android authentication, date libraries, or list implementations.

## Execution order

1. Sync concurrency: exact tombstone acknowledgement, atomic settings updates,
   snapshot-aware settings application, and device-local authentication policy.
2. Remote validation and recovery: strict files/manifests/settings/catalogues,
   private-repository/default-branch checks, rate limits, and atomic publication.
3. Data semantics and integrity: explicit field patch intent, tri-state migration,
   future-edit reconciliation, and confirmation-gated historical repair.
4. Cache publication: coherent snapshots without a new state library.
5. Privacy/UI: capture protection, consistent discreet surfaces/accessibility,
   and remaining theme/large-text/focus gaps.
6. Compatibility and validation: investigate retained dependency pins, apply only
   justified SDK-compatible changes, test migrations and available native flows.

Each completed change receives focused regression coverage and validation. Keep
one consolidated changeset. Record outcomes rather than treating this list as
evidence of completion.

## External validation limits

Physical/OEM testing and the reported Android 17 crash require a current installed
build, exact OS version and reproducible trace or device access. Do not claim a
fix from static review or Android 16 emulator success. Live GitHub testing and
publication are explicitly prohibited for this pass. Original emulator/app data
and unrelated port 8081 must remain untouched.

## Progress

### Native logger follow-up

Isolated QA reproduced Expo rejecting `RitulayaLogger.log` with “Unknown type:
class kotlinx.coroutines.StandaloneCoroutine”. The function returned `launch`'s
job across the bridge. It now uses Expo's suspend-function contract and completes
the write instead. JS handles diagnostic-write rejection and non-serializable
metadata without creating another application failure. Regression tests pass;
installed verification of the rebuilt fix remains pending. This is not evidence
for the separately reported Android 17 crash.

### Android backup policy follow-up

Added durable Expo manifest wiring and explicit exclusion resources for legacy
backup and modern cloud/device/cross-platform transfer. The rebuilt release APK
was decoded: its production package is unchanged, `allowBackup` is false, both
manifest resource references resolve, and all nine storage domains are excluded
in every section. This validates our packaged configuration, not manufacturer
compliance or an actual device transfer. Dependency reasoning and details are in
[the compatibility/platform evidence](../assessments/2026-09-06-compatibility-and-platform.md).

### Dependency compatibility follow-up

The earlier downgrade (`d075c29`) fixed Expo 57 versus RN 0.87's removal of
`rn-get-polyfills`; it did not prohibit SDK-compatible RN 0.86 patch updates.
Exact pinning from `bf9dea9` remains intentional. Applied only the fifteen patch
updates recommended by `expo install --check`, including Expo 57.0.20 and RN
0.86.3. No framework minor upgrade, NativeWind migration, or warning suppression.
The compatibility check now passes and Expo Doctor reports **21/21**. Full tests,
typecheck, lint and formatting pass with the new dependency lockfile.

### Discreet overview and layout follow-up

Today/Calendar/Settings already suppress overview health statistics and calendar
state in discreet mode. Insights now removes all cycle dates, counts, phase
correlations and symptom/mood summaries rather than merely renaming headings.
History hides search text and health filters and ignores retained filters while
discreet, so results cannot disclose a hidden health predicate. Its neutral dated
rows still deliberately open the editor. Sync and repair previews retain explicit
reveal; these are deliberate review actions, not passive overviews.

Insights dates now use the selected date locale; headers shrink/wrap, statistics
are centered, safe-area padding is retained. Setup steppers stack their labels
above flexible values with 48dp icon actions instead of 34dp targets and fixed
64dp value widths. Save has an immediate duplicate-command guard. Existing tabs
remain icon+text without press animation; the design HTML is unchanged.

React regression coverage checks Insights locale and health-summary suppression
and History's inaccessible search controls in discreet mode. This is code/test
evidence, not a claim of full TalkBack/OEM/large-font device validation.

### Cycle reconciliation follow-up

Native save, partial-write, period-fill and deletion commands now derive affected
cycle topology from recorded flow dates. Consecutive recorded flow dates less
than seven days apart share a cycle; a gap of seven or more starts another. The
next start closes its predecessor the previous day. Clearing the first flow can
shift the start; removing all flow removes the affected cycle; bridging dates can
merge and deleting a bridge can split it. Unchanged cycle IDs remain stable.

Automatic reconciliation applies only differences between the pre-command and
post-command derived timelines, not a blanket repair of historical data. Notes,
measurements and activity values are retained. Previously unassociated non-flow
entries are not assigned a cycle merely because a repair runs. Existing affected
associations are moved or cleared to avoid dangling references. Deleted cycles
retain sync tombstones/revisions.

Settings → Review history shows complete before/after cycle ranges and the number
of reassociated entries. It changes nothing until confirmation, revalidates a
revision-bound token in the same native transaction, and rejects stale previews.
Discreet mode requires deliberate reveal. No migration silently repairs history.
The old insertion-only planner is replaced, not retained as a second write policy.

### Atomic cache follow-up

`readAppSnapshot` captures cycles, day entries, settings and the widget data version
in one Room transaction. `refreshAll` derives predictions before a single
`dataStore.publish` event; all data hooks select that same version. Overlapping
refresh callers await a shared loop which discards superseded computations.
Capture/computation failures leave the preceding full snapshot intact. Settings
mutations refresh persisted state rather than patching cached values ahead of
prediction completion. The three independent data stores and their subscription
recomputation chain are removed; the existing XState dependency is retained.

Regression tests cover our publication ordering, failure retention, shared-await
semantics and downstream-only widget effects, not XState or Room internals.

Independent standards/spec review caught privacy transitions waiting for prediction
and stale scheduled reminder copy after failed settings refresh. Settings commands
now hide retained routes/dialogs and acknowledge capture protection before writes;
refreshes keep those surfaces hidden until a coherent result is ready. Reminder
policy changes invalidate queued schedules, cancel and dismiss old copy before
persistence, and keep scheduling blocked on failure. Ordinary refreshes with an
unchanged reminder policy retain durable schedules while computing, avoiding a
process-interruption gap. Successful retry restores scheduling from the new version.

- Sync scope was subsequently approved as the full revision-based protocol in
  ADR-0012, including explicit remote migration and review UI. Implementation and
  local validation are recorded in the [sync follow-up](../assessments/2026-09-05-revision-sync-validation.md).
  Steps 3–6 above remain to be completed; live-sync validation is not claimed.
- Entry semantics now use explicit clear intent and nullable sexual activity,
  preserving prior Yes/No through Room v1/v2→v3. Historical repair and future-edit
  reconciliation are still pending within step 3; no stored history is rewritten.
  Validation: 139 JS/React tests and 75 native tests passed, plus typecheck,
  lint/format/whitespace checks. The Room v3 ARM64 release-mode build passed;
  no production install, live GitHub test or publication was performed.
- The maintainer disallowed live GitHub testing and publication. Complete codewise
  and commit each validated logical change; do not create a remote QA repository.
- Capture protection now uses Android's secure-window flag for biometric lock OR
  discreet mode. A policy-change gate waits for native acknowledgement before
  exposing routes/dialogs; failed application stays closed and offers Retry.
  Transitions preserve the mounted navigator/editor draft while hiding both
  visual and accessibility content and closing the native dialog window.
  This does not complete the remaining app-wide discreet visual/accessibility audit.
  Validation: 146 JS/React tests and 75 native tests passed. Isolated Android 16
  QA confirmed SECURE on both activity/editor windows in discreet mode, removed
  with privacy off, with the selected Settings route retained. The initial native
  lifecycle callback ran off-main; UI-thread dispatch fixed the reproduced startup
  failure. Settings were restored. These checks are not OEM recording/recents or
  Android 17 crash evidence, and do not change the earlier authentication QA limits.
