# Tester feedback triage — 2026-09-11

## Implementation follow-up

The maintainer approved future-date restrictions, single-day flow logging and
clearer weekday labels. Biometric investigation was then explicitly deferred:
the maintainer could not reproduce the loop on the current build.

- Today, Calendar and existing future History entries now disable editing;
  future predictions remain visible. The shared editor also rejects attempts to
  open a future date, and JS/native entry commands reject future writes using the
  local calendar date. Availability updates at midnight and on foreground return.
- Daily saves record only the chosen date. Native cycle reconciliation still runs
  in the same transaction. Initial seeding fills elapsed days through today only.
  Existing stored entries are preserved because recording provenance is unknown.
- Both weekday heading surfaces use locale-aware abbreviations (`EEE`) instead
  of narrow initials. Guidance in all six locales explains which dates are editable.

The triage below records the pre-fix findings. Release notes are in
`.changeset/recorded-days-and-weekday-labels.md`; native changes need a rebuilt app.

Validation: 170 JS/React tests and all native test tasks passed, along with
TypeScript, ESLint/ktlint, formatting and diff checks. The Today/entry tests also
passed with `TZ=America/Los_Angeles`; native date tests use a fixed Los Angeles
clock whose date differs from UTC. Android production Hermes export passed.
No device UI QA was performed in this follow-up. The earlier Expo compatibility
check remains blocked by four existing package pins behind current recommendations.

### CI compatibility follow-up

PR #22's first CI run stopped at `yarn check:expo`. By that run, Expo's SDK 57
recommendations included 19 direct package patch updates. Updated those exact
pins and the lockfile, including `expo` 57.0.22, `@expo/ui` 57.0.18 and
`expo-router` 57.0.21. This resolves the compatibility blocker recorded above.

After the update, `yarn check:expo` passed dependency validation and all 21 Doctor
checks. TypeScript, ESLint/ktlint, formatting, all 170 JS/React tests and native
test tasks also passed. Release notes are in `.changeset/expo-sdk-57-patches.md`;
the updated native packages require rebuilding the Android app.

### ADB UI verification follow-up

Subsequent adjustment: at the maintainer's request, Calendar's Today action now
uses a 40dp minimum tap height. The emulator observations below preceded that
height adjustment.

At the maintainer's request, built and installed the current native code as the
isolated debug package `com.sudokoi.ritulaya.feedbackqa`. Used the Android 16
`Pixel_8_API_36` emulator in read-only mode, with a dedicated Metro server on 8083.

- English weekday abbreviations fit without overlap in Today and Calendar at
  1080×2400 / 420dpi (about 411dp wide), 100% text.
- At 540dpi (320dp wide), 150% system text, Calendar still displays all seven
  abbreviated headings without overlap. Today's existing horizontal strip scrolls;
  swiping revealed the seventh date with its full weekday label.
- Replaced the visually heavy Calendar Today button with supporting-size accent
  text on the shared ghost Button. Removed the extra heading/action gap and kept
  the 48dp interaction height. Verified returning from October to September and
  the action disappearing once back in the current month.
- Inspected the normal and narrow/large-text screenshots. This pass sampled English
  layout; it was not an all-locale or TalkBack audit. Calendar's five React tests,
  TypeScript and focused lint/format checks passed after the visual change.
- Restored 420dpi/100% text, then stopped the dedicated emulator and Metro server.
  The read-only emulator session did not save its temporary application/settings.

Screenshots and the temporary Gradle/ADB helpers are under the approved OpenCode
temporary directory with the `ritulaya-feedback-` prefix. Representative captures:
`today-normal.png`, `calendar-before.png`, `calendar-after.png`,
`today-small-largefont.png`, and `calendar-small-largefont.png` (all prefixed).

Reviewed the supplied feedback against the current 0.2.1 source and the earlier
[codebase assessment](./2026-09-05-codebase-assessment.md). Submission IDs identify
submissions, not necessarily distinct people. The export contains no app-version
or submission-time fields, so its ordering does not establish release chronology.

All responses have `bug_found: false`, including explicit reports of crashes,
biometric lock loops, and obscured inputs. Triage must use the response text.
Repeated comments within one submission count as one signal. Generic repeated
praise adds little verification evidence; concrete save/edit/relaunch reports are
more useful. Positive prediction impressions establish usability, not accuracy.

## Export feedback: implemented in this change

The maintainer observed that Export Data showed no progress and accepted more
taps while preparing CSVs and opening sharing. A Settings interaction regression
reproduced two export calls while the first remained unresolved.

- Settings now shows a spinner, localized “Exporting…” text, and an accessible
  busy/disabled state until the export settles. Failure retains the existing alert
  and re-enables retry.
- The handler guards rapid repeated calls. The service shares a single in-flight
  promise across callers, including a newly mounted Settings screen, preventing
  concurrent writes/deletion of the same CSV paths.
- Service regressions cover preparation, both sequential share dialogs, completion,
  and retry after read/share failures. Screen regressions cover visible pending
  feedback, repeated taps, and failure recovery.

Relevant source: `src/app/(tabs)/settings.tsx`, `src/services/export.ts`.
All six locales and `.changeset/export-pending-state.md` are updated.

## Remaining feedback

Priorities below are triage recommendations, not confirmed runtime severities.

| Priority                  | Signal                                                                                  | Current evidence and next action                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High                      | Biometric unlock repeatedly returns to lock (two submissions)                           | Current `BiometricGate` uses native authentication grants and explicitly handles credential/background ordering. Earlier isolated emulator QA covered unlock, relock, PIN fallback and cancellation. The repeated reports still warrant current-build physical-device reproduction; version, device/OS and fingerprint-vs-PIN path are needed before claiming resolution.                                      |
| High                      | Intermittent crashes on Pixel 8 Pro / reported Android 17                               | No trace or deterministic action supplied. Capture exact app/OS build, triggering steps and user-exported diagnostics. This is an unresolved crash report.                                                                                                                                                                                                                                                     |
| High                      | Upcoming days become recorded Period after an edit                                      | A concrete mechanism still exists: native `saveDayEntry` calls `fillPeriod` when flow changes from absent/none to flow. Unless the previous day already has flow, it fills the typical period length starting at the edited date, including future dates. `useCycleDayStates` treats those rows as recorded flow. This can explain the report, but does not establish that every reported edit took this path. |
| Medium                    | Future-day editing should be disabled (two submissions, one repeats it across features) | Confirmed code gap: Today/Calendar date controls and `useDayEditor` do not reject future dates. Address together with native auto-fill; disabling taps alone would still allow future records to be generated. Keep future predictions browseable. Agree whether daily logging should save only the selected day and how existing auto-filled records should be handled.                                       |
| Medium                    | Returning from a previous page “fails”                                                  | Insufficient reproduction details. Ask which route, which Back control, and whether this means a crash, blank screen, stale summary or lock prompt. Keep separate from the biometric report until linked by evidence.                                                                                                                                                                                          |
| Medium                    | Keyboard dismissal closed an unsaved editor on S23 Ultra                                | Report explicitly involved automated dismissal; it does not establish normal Android Back behavior. Reproduce keyboard-only dismissal separately from sheet dismissal and verify draft retention.                                                                                                                                                                                                              |
| Medium                    | Export appears not to work                                                              | Loading feedback is now implemented. Retest native sharing on the affected build. There is no minimum-entry requirement in the export code. Separately, unavailable sharing currently resolves silently; the vague report does not establish that this was its cause.                                                                                                                                          |
| Low                       | Week-strip letters are unclear                                                          | Still uses narrow weekday formatting (`EEEEE`) in `CycleStrip`, producing ambiguous initials in English. Prefer localized abbreviated weekdays (`EEE`), with small-screen/large-font checks. Month-grid headings use narrow formatting too.                                                                                                                                                                    |
| Clarify                   | Prediction “not really right but very close”; not enough data                           | Obtain fictional input dates, lengths, logged flow and expected/actual output. Low-confidence messaging is already present. Do not tune prediction logic from subjective agreement alone.                                                                                                                                                                                                                      |
| Expected unless clarified | Calendar prediction dates change after cycle-length settings change                     | The response literally describes dates updating to the new length, which is expected. Ask whether it meant failure to update before creating a bug.                                                                                                                                                                                                                                                            |

Native auto-fill source:
`modules/ritulaya-db/android/src/main/kotlin/expo/modules/ritulayadb/RitulayaDataStore.kt`
(`saveDayEntry`, `fillPeriod`). Recorded-marker source:
`src/hooks/use-cycle-day-states.ts`.

## Earlier feedback already has corresponding implementation

- **Logging discovery:** Today has Log today / Edit today's entry and direct
  week-date editor access; Calendar is no longer a required detour.
- **What to do after setup:** successful setup offers Log today and Explore the
  app. Some supplied responses explicitly report improved understanding.
- **Notes obscured by keyboard:** the shared editor measures its viewport and
  reveals focused inputs. Earlier Android 16 QA covered multiline Notes and BBT;
  physical-device/OEM retesting remains appropriate.
- **Prediction text size:** Today already uses larger date and supporting text.
- **Edits and persistence:** several concrete responses verify save/edit/relaunch
  and History/Insights refresh behavior. Preserve these workflows.

These are source/history matches, not proof that every reporter tested the build
containing the corresponding change.
