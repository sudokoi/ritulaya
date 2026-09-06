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
fix from static review or Android 16 emulator success. Live GitHub testing was
initially prohibited; the maintainer subsequently authorized one newly created
temporary private QA repository only. Publication and writes to any other repository
remain prohibited. Original emulator/app data
and unrelated port 8081 must remain untouched.

## Progress

### Completion status — 2026-09-06

The selected implementation slices are complete through `9e15d15`, including
the follow-up native reminder race, language freshness and logger runtime findings.
The subsequent original-audit recheck identified two omitted implementation
items: privacy-reviewed structured diagnostic fields/redaction tests, and an Expo
compatibility/Doctor CI gate. They were missed by the original completion summary
and are now addressed by these follow-ups.
The diagnostics follow-up now implements finite error categories and native
pre-storage/export projection, including legacy rows; see [the disclosure policy](../diagnostics.md).
Validation for this follow-up: 158 JS/React tests and 84 native tests pass, along
with typecheck, lint, formatting and the ARM64 release-mode rebuild. No new
installed-app diagnostic export or production installation is claimed.
The CI follow-up adds `yarn check:expo` after immutable dependency installation
and updates the two outdated setup-action major tags with maintainer confirmation.
The exact command passes under `CI=1` (Doctor **21/21**), and actionlint passes.
No hosted workflow run is claimed. See [the compatibility policy](../assessments/2026-09-06-compatibility-and-platform.md).
The subsequently authorized [live GitHub verification](../assessments/2026-09-06-live-github-sync.md)
uses only a newly created private repository and synthetic Android test stores.
The production-identity ARM64 release-mode build and a separately identified
installed QA release-mode build both pass. Current checks and device observations
are recorded in [the completion evidence](../assessments/2026-09-06-hardening-completion.md).

This completes the selected slices and the two subsequently identified audit
omissions, not publication or universal device certification. Live GitHub testing is now authorized only in the new
temporary private QA repository. Timed notification delivery, full TalkBack
and locale/font matrices, OEM transfer/capture behavior, and the separate Android
17 crash report remain external validation limits. Older checkpoints below are
historical, not a current list of unimplemented work.

### Widget and reminder publication follow-up

Widgets now omit cycle day, phase and countdown whenever discreet mode or app
lock is enabled, and publish a neutral placeholder before asynchronous reads.
Failed reads cannot leave previous health details visible. JS settings changes
hide widget details before persistence; only a successful app refresh releases
that app-owned block. An unrelated native sync refresh cannot release it.
Generation checks and synchronized rendering prevent older computations from
overwriting a newer neutral state.

Review found that JS post-registration cleanup was insufficient: JS can stop
after Android durably registers stale notification copy. Reminder registration
now uses the existing native database command boundary. `ReminderPublication`
shares one mutex with both local settings writes and sync installation, checks
the captured privacy/enabled/language policy against persisted settings, and
holds registration through native acknowledgement even if its JS caller is
cancelled. Changed policy awaits both scheduled cancellation and delivered
dismissal before persistence. JS still owns localized copy, permissions and
channel setup; Expo still owns platform scheduling. No new package is added.

The interim JS before/after policy checks and native epoch lease were replaced,
not retained as a second mechanism. The Expo dependency is obtained through
`expoModule.getExpoDependency`, compatible with SDK 57's prebuilt modules.

Native application tests cover local-write ordering, background installation
against a cancelled registration caller, stale-language rejection and failed
clearing refusing installation. Widget tests cover Ritulaya's display policy,
not RemoteViews or Android guarantees. The independent spec reviewer confirmed
the three reported surface races resolved by static recheck.

Checks: **155 JS/React tests and 79 native tests pass**, along with typechecking,
lint and formatting. The final release rebuild and isolated installed QA now
cover this slice: actual launcher rendering, private suppression/restoration,
widget-to-editor links and Android alarm registration are recorded in the
completion evidence. Timed delivery is not claimed.

### Native logger follow-up

Isolated QA reproduced Expo rejecting `RitulayaLogger.log` with “Unknown type:
class kotlinx.coroutines.StandaloneCoroutine”. The function returned `launch`'s
job across the bridge. It now uses Expo's suspend-function contract and completes
the write instead. JS handles diagnostic-write rejection and non-serializable
metadata without creating another application failure. Regression tests and the
rebuilt app's startup pass. The observed QA process log contains no repeat of the
coroutine-return error; deliberate native diagnostic failure injection was not
performed. This is not evidence for the separately reported Android 17 crash.

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

### Historical implementation checkpoints

These counts and pending statements describe the commits at those checkpoints.
The follow-ups above supersede them.

- Sync scope was subsequently approved as the full revision-based protocol in
  ADR-0012, including explicit remote migration and review UI. Implementation and
  local validation are recorded in the [sync follow-up](../assessments/2026-09-05-revision-sync-validation.md).
  Steps 3–6 were still pending at that checkpoint; they are implemented now.
  Live-sync validation is not claimed.
- Entry semantics now use explicit clear intent and nullable sexual activity,
  preserving prior Yes/No through Room v1/v2→v3. Historical repair and future-edit
  reconciliation were pending at that checkpoint and are implemented above.
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
  The remaining discreet overview fixes were implemented in the later follow-up;
  this checkpoint alone was not evidence for them.
  Validation: 146 JS/React tests and 75 native tests passed. Isolated Android 16
  QA confirmed SECURE on both activity/editor windows in discreet mode, removed
  with privacy off, with the selected Settings route retained. The initial native
  lifecycle callback ran off-main; UI-thread dispatch fixed the reproduced startup
  failure. Settings were restored. These checks are not OEM recording/recents or
  Android 17 crash evidence, and do not change the earlier authentication QA limits.
