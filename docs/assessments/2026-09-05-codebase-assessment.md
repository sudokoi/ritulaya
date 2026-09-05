# Codebase assessment — 2026-09-05

This document is a durable handoff for planning work after the September 2026
codebase assessment. It records the current product, architecture, constraints,
verified checks, and evidence-backed improvement opportunities so a future
agent does not need to repeat the initial repository survey.

It is not a replacement for:

- `CONTEXT.md`, which contains domain vocabulary only;
- `docs/decisions/`, which records accepted architecture decisions; or
- a feature plan, which should scope and sequence one selected enhancement.

## Assessment status

### Implementation follow-up — `fix/privacy-data-sync-hardening`

The original findings below describe the assessed baseline, not the current
working branch. This branch contains a first hardening pass; it does **not**
resolve every finding. Consult this status list before repeating investigation.

Implemented with regression coverage:

- `AppBootstrap` holds all routes (including widget links) behind successful
  settings/cycle/day-log loading and prediction completion, with fail-closed
  error/retry UI. Database bridge calls no longer silently fake success when
  the native module is unavailable. Store load failures propagate.
- Biometric-unavailable UI no longer offers an unauthenticated “turn off lock”
  bypass. Protected children wait for authentication, and background transitions
  relock the gate. Device authentication/resume QA is still required.
- Widgets only refresh downstream of predictions; they no longer request
  recomputation. Concurrent prediction callers share the full pending promise,
  and computation waits for initially hydrated inputs.
- Settings send only changed fields and reject failed writes. Settings UI shows
  localized save/permission errors. Editing lengths uses a settings-only route
  mode that cannot seed a period; historical seeding remains available.
- Day sheets await save/delete/clear success, prevent duplicate actions and
  dismissal while pending, retain drafts on failure, and handle Android Back.
  The sheet alone owns successful close; both calendar and widget routes use it.
- Notification permission is requested from reminder-enabling interactions,
  never from screen mount/reconciliation. Reconciliation is serialized, runs
  after bootstrap, checks permission, and respects disabled overdue reminders.
- Remote tombstones survive repeat merges, including the offline third-device
  regression. They are retained indefinitely; timestamp recency still applies.
  All syncing devices must upgrade because old clients can still drop them.
- Background sync propagates failures to WorkManager, retries transient IO and
  HTTP 408/409/429/5xx within the existing attempt limit, and preserves coroutine
  cancellation. Authentication/schema failures do not retry. Network calls now
  have 15-second connect and 30-second read timeouts and disconnect in `finally`.
- CSV parsing rejects wrong/empty headers, wrong column counts, invalid
  IDs/dates/timestamps/basic numeric values/flow, duplicate IDs/live log dates,
  and unterminated quotes, rather than overwriting input as an empty dataset.
  Tombstones with intentionally empty health fields remain valid.
- CSV exports include all fields on the current cycle/day-log models. Existing
  leading columns, formula protection, quoting, and filenames are retained.
  These are record exports, not a complete settings/restore archive.
- Insights tallies preserve accumulated counts after the third entry.
- The React test project is operational: restored the Expo preset's transform
  defaults, installed RNTL 14's missing `test-renderer` peer, and removed
  `--passWithNoTests`. No Expo/RN production packages were upgraded.

Configuration/documentation changes:

- `android.allowBackup: false`; Expo SDK 57 introspection confirms the generated
  manifest attribute is `false`. OEM device-to-device transfer and a final
  release artifact have **not** been audited.
- README storage/module/version descriptions, privacy and Keystore wording,
  OAuth-scope disclosure, ADR implementation notes/index, and bug-report
  instructions now match this pass. GitHub CSV/JSON stays plaintext by design.
- Release notes are recorded in `.changeset/privacy-data-sync-hardening.md`.

Still open / intentionally not claimed complete:

- Full entry/cycle reconciliation and repair of historical orphaned cycles.
  The atomic save and cycle-association fixes are covered by the follow-up below;
  agree expected boundaries and migration behavior before rewriting stored history.
- Sexual-activity tri-state Room migration and explicit bridge keep/set/clear
  semantics; CSV schema compatibility with old devices must be tested together.
- Full discreet visual/accessibility policy, recent-app preview protection,
  and authentication-unavailable recovery beyond retry/device credentials.
- Full remote manifest/settings/symptom/mood/mucus validation and strict CSV
  syntax, multi-file atomic publication, repo privacy/default-branch validation,
  and rate-limit-specific handling of HTTP 403.
- Settings edited during sync can still be overwritten; the local biometric
  setting is still synced. Local settings read/modify/write also needs native
  transaction/concurrency tests. Partial-field JS writes reduce but do not
  eliminate these races.
- Tombstone acknowledgement must be tested against a newer deletion of the same
  ID during sync. The orchestrator still clears captured tombstones by ID.
- One atomic cache publication/version across refreshes (initial route readiness
  is fixed, but later refreshes still publish separate store updates).
- Structured diagnostic allowlist/redaction, complete settings/restore export,
  Room migration/backup-restore tests, and on-device lifecycle/WorkManager QA.
- Expo Doctor compatibility mismatches and CI policy; deliberately pinned
  production dependencies were left unchanged.

The tests use mocked native boundaries for React and pure JVM seams for Kotlin;
they are not evidence of device QA. The original check results below are the
baseline results, not a claim about a shipped hardening release.

Validation for the hardening pass:

- `yarn test`: 14 JS/React suites, 56 tests passed; database, prediction, and sync
  Kotlin test tasks passed.
- `yarn typecheck`, `yarn lint` (ESLint + ktlint), `yarn format:check`, and
  `git diff --check`: passed.
- `yarn expo export --platform android`: production Hermes bundle exported
  successfully to an external temporary directory.
- `yarn expo config --type introspect --json`: both app config and evaluated
  Android manifest specify disabled automatic backup.
- `yarn expo-doctor`: 20/21 checks passed; the same 15 production/test Expo/RN
  compatibility mismatches reported at baseline remain. No blanket upgrade or
  warning suppression was applied.
- No release APK/AAB, connected-device tests, live GitHub sync, or commits/pushes
  were made during this pass.

### Native day-entry follow-up

The first hardening pass was subsequently committed as five focused commits:
`85de7f1`, `2a54cfd`, `acb4c5f`, `a168c9d`, and `9ef5977`. Nothing was pushed.

The next slice adds:

- A native `saveDayEntry` command. It reads persisted flow, performs period fill
  only for a non-flow-to-flow transition, and saves the submitted fields inside
  one Room transaction. JS no longer decides this transition from its cache or
  makes separate period/log writes. Existing period placement rules are unchanged.
- Correct use of `writeDayLog`'s selected cycle ID, so new/updated period-fill
  entries are associated with their cycle.
- Preservation of symptoms on existing entries during period fill. In the patch
  contract, omitted/null symptoms now keep the stored value, while an explicit
  empty list still clears it. The full editor already supplies an explicit list.
- App-level data-store tests with an in-memory Room database via Robolectric
  4.16.1 (test dependency only), plus a JS bridge-command test. The constructor
  seam is internal; production still opens the encrypted singleton database.

The association and symptom-preservation tests failed against the prior behavior
before the fixes. Tests cover Ritulaya's commands, not Room/SQLCipher transaction,
encryption, or storage guarantees. The maintainer explicitly requested avoiding
tests of behavior already guaranteed by external libraries.

Validation: 57 JS/React tests in 15 suites and all native Kotlin test tasks passed.
No database schema migration was introduced. This command requires a rebuilt
Android app; it must not be delivered as JS alone to an older native binary.
Release notes: `.changeset/atomic-day-entry.md`.

Still not addressed by this slice: cycle reconciliation after clearing/deleting
flow, existing orphan repair, sexual-activity tri-state semantics, and complete
keep/set/clear semantics for the full day-entry form. No stored history is
automatically rebuilt.

### Tester-feedback UX follow-up

The maintainer confirmed that **0.1.2 is the current shipped version**. Four
tester reports refer to **0.1.0**, not 0.1.2 or this working branch. Setup was
consistently understandable, two testers independently struggled to find logging
from Today, one reported Notes being obscured by the keyboard, and one requested
larger prediction text. One tester also reported intermittent crashes on a Pixel
8 Pro with Android 17; no crash trace or current-build reproduction is available.
Positive impressions of predictions are usability feedback, not accuracy evidence.

Implemented on this branch:

- Today has explicit Log today / Edit today's entry actions. Week-strip dates and
  the selected-day action open the existing shared editor directly, preserving
  the selected date and preloading recorded fields. Calendar remains available
  for browsing; it is no longer a required detour for logging.
- Successful cycle seeding shows a completion state with Log today and Explore
  the app actions. It appears only after persistence completes. Settings-only
  length editing still returns directly and never seeds a period.
- Prediction dates use larger, higher-contrast text; uncertainty remains visible
  in larger supporting text. Prediction calculations are unchanged.
- The day sheet uses a keyboard-avoiding, height-bounded layout and reveals the
  focused Notes/BBT input when the keyboard or viewport changes. Notes height is
  bounded so long text can scroll internally. Save remains outside the scrolling
  fields and taps are handled while the keyboard is open.
- New text is translated in all six locales. Week-strip selection uses the native
  accessibility state instead of a hardcoded English “selected” suffix.
- React tests exercise Today-to-editor interactions with existing/empty entries
  and setup success/failure handoffs. No tests merely assert framework keyboard props
  or re-test library-provided behavior.

Validation after the UX changes:

- 63 JS/React tests in 16 suites passed; all native Kotlin test tasks passed.
- `yarn typecheck`, `yarn lint` (ESLint + ktlint), `yarn format:check`, and
  `git diff --check` passed.
- Production Android Hermes export passed. No release APK/AAB was produced.
- The native day-entry follow-up was committed as `dcd4a1e` and the UX follow-up
  as `b410898`; nothing was pushed.

Native debug builds succeeded, including a temporary isolated QA application ID.
Emulator verification is **not complete**: installation over the existing app was
rejected due to a signing mismatch; the original app/data were not removed. A
separate `com.sudokoi.ritulaya.qa` package was installed, but its Metro connection
failed before functional UI testing. The maintainer then reserved the emulator
for another agent. That reservation was subsequently lifted; see “Device QA
resumed and Today fallback corrected” below for current evidence. The QA package
and the temporary reverse mapping for port 8082 were left
in place to avoid further emulator access. Only this session's host Metro server
on port 8082 was stopped; the other project's server on 8081 was left alone.

Pending device checks when access is granted:

1. Notes stays visible above the keyboard; multiline typing, internal scrolling,
   switching focus to BBT, Save, and keyboard dismissal preserve the draft.
2. The same behavior works from Today, Calendar, and the widget route, including
   large system fonts and a small viewport.
3. One tap opens the correct date, existing entries preload, and saving updates
   the visible summary without a Calendar detour.
4. Setup offers both next steps without re-seeding when returning to the app;
   settings-only length changes do not show the onboarding completion state.
5. Reproduce/capture the Pixel 8 Pro Android 17 crash separately on a current
   build, with exact app/OS build, triggering action/time, and redacted logs.

The keyboard change is an implementation awaiting device confirmation, not a
verified fix of the tester's report. Nothing in this slice establishes a cause or
fix for the intermittent crash. Release notes: `.changeset/today-logging-ux.md`.

### Day-entry workflow and searchable history follow-up

The maintainer explicitly deferred device QA while another agent uses ADB. This
slice used **no ADB/emulator access** and does not change the earlier device-QA or
crash-investigation status.

Implemented:

- `src/domain/day-entry.ts` now owns save, delete, and clear-flow commands. Each
  awaits persistence and `refreshAll()` and propagates either failure to the
  editor. Clearing flow submits only the date and `flowIntensity: "none"`, so
  other fields are retained from persistence rather than copied from a UI cache.
- Removed the alternate mutation exports from `useDayLogs` and `day-log-store`,
  together with the now-unused per-record cache update events. The store remains
  the loaded-record cache; this is not a state-library or folder migration.
- `useDayEditor` handles selection and delegates commands. The widget route now
  uses it too, while retaining its existing navigation and action availability.
- An ESLint import restriction keeps the DB bridge and native persistence imports
  out of screens, components, and hooks. The existing local/CI `yarn lint` command
  runs it. A deliberately invalid import supplied through stdin failed with the
  intended rule, and the equivalent day-entry command import passed; no fixture
  file or pre-commit hook was installed.
- `/history`, linked from Today and Calendar, shows recorded entries newest first
  in a virtualized list. Note search is a case-insensitive Unicode-normalized
  substring match. Date bounds are inclusive and optional; a selected symptom and
  mood combine with the other filters using AND. Invalid or reversed dates show
  validation errors rather than silently ignoring a filter.
- Results open the shared editor. Save/delete refresh results while preserving
  filters; failed saves retain the draft. Empty history and no matches have
  distinct states. The first version uses explicit `YYYY-MM-DD` date inputs and
  single-select symptom/mood filters, not a new native date picker dependency.
- Discreet-mode result previews omit flow, mood, symptoms, and notes. Queries and
  filters live only in screen state, not URLs, logs, persistent storage, or a
  search service. This does not complete the app-wide discreet-mode policy.
- History reads the existing cache without creating another record store or
  search index. All records, including previously auto-filled days, remain as
  stored; this slice adds neither recording provenance nor prediction entries.
  There is no DB migration, native bridge addition, or GitHub format change.

Validation:

- 97 JS/React tests in 19 suites passed; all native Kotlin test tasks passed.
- Typecheck, ESLint/ktlint, formatting, and `git diff --check` passed.
- Production Android Hermes export passed. No new APK/AAB or device tests.
- React tests now transform the ESM `@xstate/store` and `@xstate/store-react`
  packages alongside the Expo preset. History interaction tests use the real
  cache subscription and command layer with a mocked persistence boundary.
- Tests cover application filtering, command sequencing/failures, and visible
  editor/result behavior; they do not re-test Room, SQLCipher, or native list and
  keyboard guarantees.

Pending device checks include history text-input focus, keyboard interaction,
large-font layouts, filter scrolling, long-history scrolling, and TalkBack.
Cycle reconciliation, historical orphan repair, nullable-field migration, sync
concurrency, and atomic cross-store refresh remain outside this slice. The earlier
native `saveDayEntry` change still requires a rebuilt Android app.

Release notes: `.changeset/day-entry-workflow.md` and
`.changeset/searchable-history.md`. The workflow changes were committed as
`64bb7c8`, searchable history as `c3cfaf4`, and the Today fallback below as
`9149297`. Nothing was pushed.

### Device QA resumed and Today fallback corrected

The maintainer subsequently released ADB for this session. QA resumed on the
Android 16 arm64 emulator (1080×2400, initial font scale 1.0), using debug builds
with isolated application IDs `com.sudokoi.ritulaya.qa` and
`com.sudokoi.ritulaya.qa.empty`. The latter provides a fresh-data check without
clearing either the first QA package or the original app. Neither production app
data nor another project's app was replaced or cleared.

Observed and corrected at the maintainer's request:

- A fresh install displayed a large `-` above “Menstrual Phase” with estimated
  dates despite having no current cycle. This was a literal UI placeholder, not
  a font rendering issue. A React regression test reproduced the dash before
  the fix.
- Today now shows “No current cycle yet” with guidance while keeping setup and
  daily logging available. It hides the unanchored phase, progress, countdown,
  uncertainty text, and phase advice in this state.
- When a current cycle exists, Today shows the actual number and a “Cycle day”
  label. Its calculation now uses local calendar dates. Missing predictions do
  not generate the old hardcoded 14-day countdown; a future start is not clamped
  to day one today.
- All six locales include the new copy. React regressions cover absent/current/
  future cycles and early/late local times; the focused suite passed with
  `TZ=America/Los_Angeles` as well.

After the Today correction, all 101 JS/React tests in 19 suites passed, together
with typecheck, ESLint/ktlint, formatting, diff checks, and the production Android
Hermes export. No native source was changed for this correction.

Device observations so far:

- Verified the new empty header on the fresh QA package and **3 / Cycle day**
  on the QA package seeded with a period starting two days earlier.
- Verified setup completion displays both next steps; Log today opens the shared
  editor. A Notes-only entry can be saved from Today without creating a cycle,
  and the selected-day summary updates with the saved note.
- Notes received focus and text with both Gboard's stylus toolbar and full docked
  keyboard. Save stayed visible. The docked-keyboard screenshot shows the Notes
  field's lower portion clipped, so full multiline/cursor visibility is **not**
  signed off. Hardware Enter/text injection during the multiline attempt led to
  a development reload; this is not evidence of a production crash.
- The temporary keyboard settings were restored: `show_ime_with_hard_keyboard`
  to `0`, and `stylus_handwriting_enabled` to its original unset state.

QA screenshots and the temporary ADB helper are outside the repository under the
approved OpenCode temporary directory. Key artifacts are
`ritulaya-qa-empty-fallback.png`, `ritulaya-qa-recorded-cycle.png`,
`ritulaya-qa-setup-complete.png`, and `ritulaya-qa-keyboard-typed.png`.

History device interaction checks, full multiline/BBT keyboard checks, large-font
and TalkBack checks, and the Pixel 8 Pro / Android 17 crash investigation remain
open. The latest Today correction is recorded in
`.changeset/today-cycle-fallback.md`; it does not alter native predictions or
stored history.

The host Metro server on port 8082 remains available for inspecting the QA app;
the debug-only QA preferences point to `localhost:8082` through the existing ADB
reverse mapping. The separate project's port 8081 was not changed.

### UI refresh design review

The maintainer approved starting a UI refresh while preserving Ritulaya's
identity. The design brief and current token/component inventory live in
[`docs/design/ui-refresh.md`](../design/ui-refresh.md), with an offline
Today/editor proposal in
[`docs/design/ui-refresh-preview.html`](../design/ui-refresh-preview.html).
These were initially review-only artifacts. The maintainer subsequently approved
native implementation, retaining tab icons/text without touch animation and
requiring centered editor button labels. The HTML preview remains unchanged.

### Native Today/editor refresh

Implemented on `feat/ui-refresh-and-hardening` after approval:

- Authored theme tokens feed native palette adapters and Tailwind/CSS variables;
  navigation and status-bar text follow the theme. Tabs have no press effect.
- Today now has compact cycle context, separate estimates, one entry summary,
  and direct week-date editing. Its discreet overview hides health details and
  markers without introducing authentication or changing app-wide privacy policy.
- Shared text, button, chip, and field primitives support centered labels,
  wrapping choices and a 48dp control minimum. The editor has fixed Save/Close,
  inline failures, earlier Notes, and an additional-tracking disclosure that
  preserves hidden values and expands for saved measurements.
- Android QA reproduced Notes clipping and corrected the sheet's own viewport
  calculation and height avoidance. On the isolated Android 16 QA app, observed
  docked-keyboard multiline input through ten lines, internal scroll/cursor,
  BBT entry, collapse-and-save retaining measurements, and reopened saved data.
  Sampled light/dark and 150% system text; this is not release or TalkBack QA.

All 107 JS/React tests in 19 suites, typecheck, ESLint/ktlint, formatting, diff
checks, and Android Hermes production export pass. No dependency, native module,
schema, or plaintext GitHub format changes. No live sync, release install, push,
or merge. Further keyboard/OEM, narrow/all-locale, TalkBack, native failure, and
Pixel/Android 17 checks remain open. The detailed source/evidence record is in
[`docs/design/ui-refresh.md`](../design/ui-refresh.md#native-implementation--2026-09-05).

The reviewed direction is committed as `f9c8a7b`, the theme foundation as
`47f99a3`, and the native pilot as `376f650`. Temporary emulator keyboard/font
settings and the QA app's theme/discreet preferences were restored. The original
app/data and the unrelated port 8081 remain untouched; QA Metro stays on 8082.

### Baseline assessment

- Repository state assessed: `main` at `dc7003d` (`0.1.2`).
- Assessment date: 2026-09-05.
- Assessment mode: architecture Deepen + Harden review; no runtime device QA.
- Findings below come from documentation review, static call-path analysis,
  history hotspots, and local quality checks.
- Before implementation, reproduce device/lifecycle findings where practical
  and read the exact Expo SDK 57 documentation required by `AGENTS.md`.

## Non-negotiable product constraints

These are intentional decisions, not improvement targets:

1. **GitHub sync is plaintext by design.** Synced CSV and JSON files must remain
   human-readable plaintext in the user's private GitHub repository. Do not add
   application-level encryption to the repository copy. The on-device database
   remains encrypted at rest. UI and documentation must continue to disclose
   that the repository copy is plaintext and that repository privacy is the
   user's responsibility.
2. **No Ritulaya account.** Optional GitHub authorization is not an application
   account system.
3. **No analytics, telemetry, advertising SDKs, or remote crash reporting.**
   Diagnostics remain local until the user explicitly exports or shares them.
4. **Android only.** An iOS or web implementation is not in current scope.
5. **Predictions run on-device.** Do not move health or cycle computation to a
   hosted service.
6. **Not a medical device or contraceptive tool.** Product copy must not imply
   medical advice or contraceptive reliability.
7. **Local-first operation.** Core tracking must work without GitHub or network
   access.

## Product summary

Ritulaya is a privacy-first Android period tracker in Google Play closed
testing. It currently provides:

- flow, symptom, mood, notes, cervical mucus, basal body temperature, and
  sexual-activity logging for a calendar date;
- automatic cycle creation/extension based on recorded flow;
- period, uncertainty, fertile-window, ovulation, phase, and confidence
  predictions computed locally;
- Today, Calendar, Insights, Settings, cycle-seeding, privacy, GitHub sync, and
  day-editor surfaces;
- SQLCipher-encrypted Room persistence with an Android Keystore-wrapped random
  database key;
- optional foreground and WorkManager GitHub sync;
- local notifications, biometric app lock, discreet mode, and an Android home
  screen widget;
- six bundled locales: en-US, en-GB, en-IN, Hindi, Japanese, and Korean; and
- local structured logs with user-initiated bug reporting.

## Current architecture

### React Native application

- Expo SDK 57, React Native 0.86, React 19, TypeScript, and Expo Router.
- Route files live in `src/app/` and currently contain substantial screen
  composition and workflow logic.
- NativeWind 4 and owned React Native primitives provide styling/UI.
- Module-level `@xstate/store` stores cache cycles, day logs, settings,
  predictions, sync status, and GitHub device-flow state.
- Hooks expose store selections and workflow actions.
- `src/services/` adapts Expo and custom native modules.
- `src/domain/` contains the canonical day-entry action and display-label
  helpers.
- `src/data/refresh.ts` reloads cycles, day logs, and settings together.

### Native Android modules

- `ritulaya-db`: Room + SQLCipher schema, day-log writes, cycle planning,
  settings, tombstones, and merge persistence.
- `ritulaya-crypto`: database-key generation and Android Keystore wrapping.
- `ritulaya-predictions`: pure Kotlin prediction/statistics engine and widget
  snapshot persistence.
- `ritulaya-sync`: GitHub OAuth device flow, API client, CSV/JSON serialization,
  merge engine, orchestration, and WorkManager worker.
- `ritulaya-logger`: local Room-backed diagnostic log.
- `ritulaya-widget`: Android widget rendering and logging deep link.

### Persistence and synchronization

- `RitulayaDataStore` is the intended single facade over the encrypted Room
  database.
- Foreground and background synchronization both use `SyncOrchestrator`.
- The repository copy consists of root-level cycle/day-log CSVs, settings JSON,
  and a manifest.
- Conflict resolution is timestamp-based last-write-wins, including comparison
  of edit and deletion timestamps.
- Local deletion records are represented as sync tombstones.

### Prediction flow

- Store changes trigger `recomputePrediction()`.
- Inputs cross the JS/native seam and the Kotlin engine returns prediction,
  period length, average cycle length, phase, and regularity statistics.
- The native module also persists a localized widget snapshot.
- JS derives recurring calendar markers from the next prediction for the
  visible horizon.

## Strengths to preserve

- Product and privacy positioning are unusually clear.
- `CONTEXT.md` establishes useful domain language.
- ADR-0010 removed the earlier split database stacks and established one native
  persistence owner.
- Core database operations such as logging a period use Room transactions.
- Foreground and background sync share one implementation.
- Sync persistence protects many edits/deletions made while a sync is running.
- Prediction confidence and uncertainty avoid presenting dates as exact.
- Prediction, cycle placement, merge, CSV, derivation, export, theme, and
  translation behavior have pure tests.
- TypeScript strictness, ESLint, Prettier, ktlint, exact dependency pins, and CI
  are in place.
- The repository contains no analytics SDK or telemetry pipeline.

## Findings ranked by priority

The rankings describe planning priority, not confirmed production severity.
Lifecycle findings still need device reproduction.

### P0 — bootstrap can expose protected content and load incomplete data

**Evidence**

- `src/app/_layout.tsx` renders `BiometricGate` while persisted settings are
  still loading.
- `settingsStore` starts with `biometricLock: false` and has no loaded/readiness
  state.
- `BiometricGate` initially treats the application as unlocked from that
  default.
- Initial cycle/day-log loading is driven by the Today screen's focus effect,
  not by application bootstrap.
- `src/app/log-today.tsx` can be opened directly by the widget before Today has
  focused and refreshed the stores.

**Impact**

- Sensitive content may render briefly before the persisted biometric setting
  is known.
- A cold widget deep link can open a blank editor for an existing entry. Saving
  that form can clear existing fields or execute period-transition logic using
  an empty JS cache.

**Suggested planning direction**

Create one fail-closed application bootstrap module that loads settings,
cycles, and day logs before protected routes render. It should expose explicit
`loading`, `ready`, and `failed` states and own initial prediction/reminder/
widget reconciliation.

### P0 — prediction and widget effects probably form a feedback loop

**Evidence**

- `src/hooks/use-widget.ts` depends on the prediction object.
- Its effect calls `recomputePrediction()`.
- Recompute always publishes a newly mapped prediction object when successful.
- Publishing that object retriggers the widget effect.

**Impact**

Repeated native prediction calls, SharedPreferences writes, widget broadcasts,
renders, CPU use, and battery consumption are possible.

**Suggested planning direction**

Give prediction computation one owner. Make widget refresh a downstream effect
of a stable completed prediction version rather than a trigger for prediction
computation. Confirm the loop with instrumentation before implementation.

### P0 — editing cycle lengths unintentionally logs a period

**Evidence**

- Settings labels its action as adjusting cycle lengths and routes to `/seed`.
- `src/app/seed.tsx` always calls `logPeriodOnDate()` after saving settings.
- The screen initializes `daysAgo` to zero even when entered from Settings.

**Impact**

A user changing typical lengths can create/extend a period beginning today and
alter predictions/history unintentionally.

**Suggested planning direction**

Separate “seed/backfill a historical period” from “edit prediction settings.”
They may share form primitives, but their commands and copy must be distinct.

### P0 — cycle records are not reconciled after flow removal

**Evidence**

- Adding period flow invokes native cycle placement and boundary updates.
- Deleting a day log or changing flow to `none` only changes/removes the day-log
  row.
- No inverse operation recalculates affected cycle boundaries or removes empty
  cycles.

**Impact**

Cycle records can diverge from the flow history that conceptually creates
them, leaving empty/open cycles and stale prediction inputs.

**Suggested planning direction**

Move the complete “save day entry and reconcile timeline” command into the
native data domain and execute it atomically. Cover add, remove, backdate,
delete, and sync-merge scenarios.

### P0 — Android backup policy conflicts with the privacy/storage model

**Evidence**

- The generated Android manifest has `android:allowBackup="true"`.
- The database and encrypted SharedPreferences ciphertext may therefore be
  eligible for platform backup.
- Android Keystore keys generally do not restore with backed-up ciphertext.

**Impact**

Encrypted application files may leave the device through Android backup, and
a restored installation may be unable to decrypt restored data.

**Suggested planning direction**

Choose and document an explicit Android backup policy. Prefer disabling backup
unless tested extraction rules can safely exclude non-restorable encrypted
material. Keep privacy copy aligned with the chosen behavior.

### P1 — sexual-activity tri-state semantics are not persisted

**Evidence**

- The domain input is `boolean | null` and UI comments describe an unset state.
- `DayLogEntity.sexualActivity` is a non-null integer with a zero default.
- Native patch resolution converts a new unset value to zero.
- Sending null on an existing row means “keep,” and the UI cannot return to
  unset after recording yes/no.

**Impact**

“Unrecorded” and “No” collapse into one value, contrary to domain types and
release notes.

**Suggested planning direction**

Use a nullable database field or an explicit enum and define unambiguous
keep/set/clear bridge semantics, including a Room migration.

### P1 — mutation failures are swallowed or close editors prematurely

**Evidence**

- `updateSettingsFn()` catches persistence errors and resolves normally.
- Callers awaiting it cannot distinguish success from failure.
- The settings error field is not presented to the user.
- `DayDetailSheet` calls `onSave()` and immediately calls `onClose()` although
  saving is asynchronous in actual callers.
- The deep-link editor also closes before save completion.

**Impact**

UI can report or imply success after failed persistence, subsequent commands
can run on stale settings, and a failed day-entry save discards the draft.

**Suggested planning direction**

Make mutations reject with domain-shaped errors, add pending states, and close
editors only after confirmed success. Avoid duplicate close ownership between
sheet and workflow hook.

### P1 — WorkManager retries never activate for ordinary sync failures

**Evidence**

- `SyncOrchestrator.sync()` catches exceptions and returns an error status.
- `SyncWork.doWork()` retries only when `orchestrator.sync()` throws.
- It therefore returns `Result.success()` for caught network/API failures.

**Impact**

Transient background failures wait until the next periodic run instead of
using WorkManager retry/backoff behavior.

**Suggested planning direction**

Return a typed sync outcome or let retryable failures propagate to the worker.
Distinguish retryable network/server failures from authentication,
configuration, schema, and permanent client errors.

### P1 — tombstones can disappear before all devices observe deletion

**Evidence**

1. A local deletion is uploaded as a tombstone.
2. Its local tombstone is cleared after that successful push.
3. On the same device's next sync, the remote-only tombstone is omitted by
   `MergeEngine` and the rewritten CSV removes it.
4. An offline device can later merge its stale live row against a repository
   with no tombstone and re-upload the row.

**Impact**

Deleted records can be resurrected across infrequently synced devices. This
does not match ADR-0009's claim that tombstones are consumed after every device
has synced.

**Suggested planning direction**

Define a durable retention/compaction policy or device acknowledgement model.
Test the full three-device/offline lifecycle, not only pairwise merge rules.

### P1 — notification permission and scheduling run before user intent/readiness

**Evidence**

- `useNotifications()` requests permission whenever Today mounts, even when
  reminders are disabled.
- The hook can run using default settings/prediction values before persisted
  state has loaded.
- Reminder reconciliation starts by cancelling all scheduled notifications.

**Impact**

Users receive an out-of-context permission prompt, and valid reminders can be
temporarily replaced or cancelled using defaults.

**Suggested planning direction**

Request permission only from the direct “enable reminder” interaction. Run
reconciliation after application bootstrap and serialize it against language,
settings, and prediction changes.

### P1 — user export is incomplete

**Evidence**

- `src/services/export.ts` exports date, flow, symptoms, mood, and notes.
- It omits cervical mucus, BBT, sexual activity, IDs, timestamps, and cycle
  relationships that exist in the current data model and sync format.

**Impact**

The user-facing export is not a complete portable copy of the user's data.

**Suggested planning direction**

Define a versioned export contract and include all user-owned fields. Keep
spreadsheet-injection protection and temporary-file cleanup.

### P1 — remote sync files are insufficiently validated

**Evidence**

- GitHub files are externally editable input.
- A wrong CSV header is treated as an empty dataset.
- Rows are accepted with missing IDs, malformed dates/timestamps, invalid enum
  values, malformed symptom JSON, and duplicate logical dates.
- Manifest/schema compatibility is not validated before merge and writeback.

**Impact**

Malformed or future-version files can corrupt local state or be overwritten by
apparently valid empty/current-format output.

**Suggested planning direction**

Validate manifest compatibility and complete rows before merge. Fail closed
without modifying local or remote data and present a recoverable sync error.
This validation must preserve the plaintext, human-editable sync design.

### P1 — discreet mode does not cover the whole app

**Evidence**

- `CONTEXT.md` defines discreet mode as neutral relabeling across app,
  notifications, and widget.
- Notifications and widget have discreet variants.
- Today still exposes phase, period countdown, uncertainty, and cycle-day copy.
- Calendar legends and accessibility labels expose period, fertile, and
  ovulation language.
- Tab labels remain unchanged.
- Insights and seed mask selected headings but retain other sensitive copy and
  values.

**Impact**

Users relying on discreet mode can still expose cycle information visually or
through accessibility services.

**Suggested planning direction**

Define a single discreet presentation policy and audit visible text,
accessibility labels, notifications, widget, deep links, and recent-app
previews. Avoid scattered per-string conditionals where a domain display model
can own the policy.

### P1 — “hardware-backed” security wording is stronger than the code proves

**Evidence**

- Database and token wrapping keys are created in Android Keystore.
- The implementation does not inspect the key security level or require
  StrongBox/hardware backing.
- Documentation and store copy repeatedly promise a hardware-backed key.

**Impact**

Some supported devices may provide software-backed Keystore keys, making the
public claim inaccurate.

**Suggested planning direction**

Either verify/enforce an accepted hardware security level with a documented
compatibility fallback, or change claims to “Android Keystore-backed.” Do not
weaken the existing encryption implementation while correcting terminology.

### P1 — GitHub authorization scope and network behavior need hardening

**Evidence**

- OAuth requests the classic GitHub `repo` scope, which grants access broader
  than the one selected backup repository.
- `HttpURLConnection` calls set no explicit connect/read timeouts.
- Sync performs several sequential file reads/writes, so partial remote updates
  are possible if a later request fails.

**Impact**

Users may not understand the authorization breadth, calls can hang for long
periods, and a failed run can leave a partially updated repository until retry.

**Suggested planning direction**

Disclose required GitHub scope clearly, evaluate narrower authorization only
if it still supports the design, set explicit timeouts, and document/test
partial-update recovery. Plaintext repository files remain intentional.

### P2 — local diagnostics are safe but low-value

**Evidence**

- JS records error metadata, but native `exportLogs()` exports only the static
  message and omits metadata entirely.
- The sanitizer handles dates and selected health fields in message text but
  does not provide a structured allowlist.
- The issue template references “Settings → Export Debug Logs,” while the app
  exposes “Report Bug.”

**Impact**

Exported logs often say only “Failed to…” without an exception class, safe
context, version, or stack, limiting diagnosis under the no-telemetry policy.

**Suggested planning direction**

Define a privacy-reviewed allowlist of diagnostic fields and add explicit
redaction tests. Keep export user-initiated and update issue/app wording.

### P2 — screen/workflow locality is weak in the main hotspots

Frequently changed and/or large files include:

- `src/app/(tabs)/settings.tsx` — 410 lines;
- `src/components/day-detail-sheet.tsx` — 390 lines;
- `src/app/settings/github-sync.tsx` — 352 lines;
- `src/components/month-grid.tsx` — 278 lines;
- `src/app/(tabs)/index.tsx` — 231 lines; and
- native orchestrator/data/engine modules around 300–370 lines each.

The React Native tree is organized mainly by technical layer. Route files own
substantial workflow logic, while some hooks are thin pass-throughs over
stores. `refreshAll()` and prediction subscriptions encode ordering implicitly.

**Suggested planning direction**

Do not perform a broad folder rewrite. Deepen one proven workflow at a time,
starting with bootstrap/security and day-entry/cycle mutation. As slices move,
keep Expo Router files thin and colocate private components/hooks with their
workflow. Add import-boundary enforcement only after a useful boundary has
been proven by migration.

### P2 — bridge and persisted-schema contracts are duplicated manually

TypeScript and Kotlin independently describe day-log fields, patch sentinels,
settings, prediction records, sync status, enums, and CSV columns.

**Suggested planning direction**

Add cross-seam contract fixtures for serialization, null/clear behavior,
enum/date validation, and schema evolution. Code generation is optional and
should be considered only if fixtures prove insufficient.

## Testing and quality-gate assessment

### Commands run during assessment

- `yarn typecheck` — passed.
- `yarn format:check` — passed.
- `yarn lint` — passed, including ktlint.
- `yarn test` — passed:
  - 6 JavaScript unit suites;
  - 38 JavaScript tests;
  - Kotlin tests for database patching/cycle placement, prediction, CSV, and
    merge behavior.
- `yarn expo-doctor` — failed 1 of 21 checks because 15 Expo/RN packages no
  longer match current SDK 57 recommendations.

### Gaps

- The configured React/Jest project currently has zero tests; the global
  `--passWithNoTests` setting hides this.
- No automated tests cover route bootstrap, hooks, screen interaction,
  biometric readiness, notification permission flow, or widget deep links.
- Sync tests exercise pure merge/CSV behavior but not orchestration,
  WorkManager outcomes, partial pushes, or durable tombstone lifecycle.
- Room migration and Android backup/restore behavior are not tested.
- CI runs lint, formatting, typecheck, JS tests, and Kotlin tests but not Expo
  Doctor.

### Highest-value tests to add first

1. Biometric-enabled cold start does not render protected content before auth.
2. Cold widget deep link loads and preserves an existing day entry.
3. Widget refresh does not trigger repeated prediction recomputation.
4. Failed day-entry save keeps the editor and draft open.
5. Failed settings persistence rejects and does not execute dependent actions.
6. Changing typical lengths does not log a period.
7. Removing the last flow entry reconciles affected cycles.
8. Background sync maps retryable failure to `Result.retry()`.
9. A deletion remains deleted through an offline third-device scenario.
10. Notification permission is requested only after the user enables a
    reminder.
11. Discreet-mode visible and accessibility copy contains no disallowed cycle
    terms.
12. Full export round-trips every user-owned field.

## Documentation drift to resolve

- `README.md` still names `expo-sqlite + Drizzle` and `src/db/`, both superseded
  by ADR-0010 and the native Room module.
- ADR-0002 says NativeWind 5; `package.json` uses NativeWind 4.
- ADR-0008 documents two CSV files and a manifest but not
  `ritulaya-settings.json`.
- ADR-0008 illustrates a `ritulaya-data/` directory, while implementation uses
  repository-root files.
- ADR-0009's supersession note says delete-wins semantics remain, while current
  implementation and changelog use timestamp recency.
- `docs/decisions/README.md` does not index ADR-0011.
- The bug issue template names a debug-log export path that does not exist under
  that name in the app.
- Public “hardware-backed” and “data never leaves the device” wording needs to
  be reconciled with actual Keystore guarantees, Android backup behavior, and
  clearly disclosed optional plaintext GitHub sync/export.

## Dependency state

Expo Doctor reported current recommendation mismatches for Expo, React Native,
Router, Notifications, several Expo modules, and `jest-expo`. Some versions
were deliberately pinned or downgraded to fix release-only failures, so do not
run an indiscriminate upgrade. Review SDK 57 changelogs and existing release
history, update in a dedicated compatibility slice, and add a documented Expo
Doctor policy to CI.

## Recommended sequencing for future planning

1. **Bootstrap and privacy hardening**
   - fail-closed initialization and widget deep-link safety;
   - prediction/widget effect ownership;
   - Android backup policy;
   - notification consent timing; and
   - complete discreet-mode policy.
2. **Data integrity**
   - separate seed from settings editing;
   - atomic entry/timeline reconciliation;
   - true tri-state sexual activity;
   - mutation error contracts; and
   - complete export.
3. **Sync reliability**
   - WorkManager outcomes;
   - durable tombstones;
   - remote schema validation;
   - network timeouts/partial-update recovery; and
   - transparent OAuth-scope copy.
4. **Architecture and verification hardening**
   - migrate the selected workflows behind deeper interfaces;
   - add lifecycle/UI/native integration tests;
   - align Expo Doctor policy; and
   - repair documentation drift.
5. **Product enhancements**
   - richer insights, logging UX, prediction explainability, reminder controls,
     onboarding, and further accessibility work after the reliability baseline.

## Deliberately deferred or rejected directions

- **Encrypting GitHub files:** rejected; plaintext is an explicit product
  requirement.
- **Moving predictions or storage to a hosted backend:** rejected; conflicts
  with local-first and privacy decisions.
- **Adding analytics to discover usage:** rejected; conflicts with ADR-0006.
- **Big-bang feature-folder rewrite:** deferred; high churn without proving a
  workflow seam. Migrate one vertical slice at a time.
- **iOS/web support:** deferred by ADR-0005.
- **Changing prediction algorithms solely for novelty:** deferred until there
  is a validated product or correctness requirement.

## Starting point for the next agent

Do not repeat a whole-repository assessment unless this document is stale.
Instead:

1. confirm the target issue with the maintainer;
2. select one item from the recommended sequence;
3. reproduce its relevant runtime behavior;
4. read exact Expo SDK 57 documentation before writing Expo code;
5. produce a repository-aware vertical-slice plan;
6. preserve all non-negotiable constraints above; and
7. run the repository checks plus the targeted new test/device scenario.
