# Hardening completion — 2026-09-06

## Outcome and scope

The approved codewise backlog and subsequent concrete review findings are
implemented through `9e15d15`. The [execution plan](../plans/2026-09-05-remaining-hardening.md)
records the individual changes. Earlier assessments remain historical evidence,
not the current pending-work list.

All commits after `601cb5d` remain local. No push, publication, production install,
live GitHub sync, remote QA repository or test credentials were used. Production
identity remains `com.sudokoi.ritulaya`. GitHub CSV/JSON stays human-readable
plaintext; on-device SQLCipher remains enabled. There is still one consolidated
minor changeset with native rebuild and all-syncing-devices upgrade guidance.

## Final automated and build evidence

- **155 JS/React tests in 29 suites** and **79 native tests** pass. Native counts:
  database 25, sync 33, auth 4, predictions 14, widget 3. These totals include the
  logger boundary tests and native reminder ordering/cancellation regressions.
- Typecheck, lint, formatting and whitespace checks pass. Tests target Ritulaya's
  commands, data-preserving migrations, policy, request contracts and observable
  UI rather than proving external-library guarantees.
- Expo compatibility check passes; Expo Doctor reports **21/21**.
- Current-source **ARM64 release-mode build passes**, including the final native
  reminder, widget and logger changes. It uses local debug signing and is not a
  Play-signed production release artifact or proof of multi-ABI delivery.
- The packaged manifest has the production application ID, is non-debuggable,
  sets `allowBackup=false`, and references both backup exclusion resources.
  Earlier decoded all-domain exclusions are recorded in the
  [compatibility/platform evidence](./2026-09-06-compatibility-and-platform.md).
- The independent spec recheck found the three reported surface counterexamples
  resolved: JS lifetime no longer owns registration cleanup; stale-language
  requests are rejected; cancellation and delivered dismissal are acknowledged
  before changed policy is installed. That recheck was static, not device/network
  race reproduction.

## Installed Android evidence

Device: isolated synthetic-data installation `com.sudokoi.ritulaya.qa`, displayed
as **Ritulaya QA**, on `Pixel_8_API_36` / Android 16 (`emulator-5554`). The release
variant contains its JS bundle and starts without Metro. The QA application-ID
override and label resource live outside the repository. The production-identity
APK was copied aside before generating the QA variant; it was not installed.

Observed on that rebuilt installation:

1. Startup reaches Today with existing synthetic entries and estimates, not a
   stale splash-screen capture. Returning after restart also succeeds. The final
   QA process log has no `StandaloneCoroutine`, unhandled rejection or fatal
   exception. This checks startup, not every possible native diagnostic-write
   failure; JS rejection/serialization behavior has regression coverage.
2. Added the specifically labelled QA widget through the launcher widget picker.
   It shows day, phase and countdown with privacy off. Enabling discreet mode
   replaces those details with neutral **Today**. Disabling discreet mode restores
   the ordinary content. This is actual widget-host evidence, not a preview.
3. Tapping the QA widget opens today's editor, including while discreet mode is
   enabled. The deliberately opened editor displays its controls. Both activity
   and editor windows carry `SECURE` while private; the activity flag is removed
   after restoring privacy off.
4. An unsaved **Calm** selection remains selected after backgrounding and returning
   to the private editor. Closing it without Save leaves today's entry unrecorded.
   Toggling discreet mode retains the selected Settings route.
5. All six language choices can be selected in the installed app with localized
   Settings labels. Hindi Today/Settings and cycle-length setup were spot-checked
   at 130% font scale. Setup labels sit above centered values, the controls and
   Save remain visible, and the heading is readable. This is not an exhaustive
   screen-by-screen localization, TalkBack or maximum-font audit.
6. Enabling Daily Log requests notification permission. After granting it, Android
   lists the QA package's Expo daily 20:00 and period-ahead 09:00 alarms. This
   exercises the new native registration path. The clock was not changed and
   actual timed delivery was not observed.

Restored: language/theme System, discreet and biometric lock off, Daily Log off,
period-ahead two days, font scale 1.0, density 420, and the original ungranted
notification permission/flags. Original app data, credentials and Keystore were
not changed. The labelled synthetic QA widget remains on the launcher's second
page; attempted removal gestures did not remove it. No other launcher widget was
changed. QA screenshots/XML/logs remain local outside the repository.

## Remaining validation limits

- **Prohibited:** live GitHub verification and publication. Hermetic Git adapter,
  protocol and recovery tests are not a claim of live GitHub success.
- **Unavailable:** current-build physical/OEM/Android 17 crash reproduction and
  trace, OEM transfer behavior, production signing and multi-ABI delivery.
- **Not established here:** actual timed notification delivery, biometric-only
  widget rendering on a newly credentialed device, widget read-failure injection,
  full TalkBack/locales/font-size coverage, or OEM recording/recents compliance.
  Application policies and relevant ordering failures have local regression tests.

These are explicit evidence limits, not known unimplemented approved features.

## Local evidence identifiers

All files below are under the session's approved `T/opencode` temporary directory:

- `ritulaya-completion-tests.log`
- `ritulaya-final-release-validation.log`
- `ritulaya-installed-release-build.log`
- `ritulaya-9e15d15-production-id-release.apk`, `ritulaya-9e15d15-manifest.xml`
- `ritulaya-widget-installed-normal`, `ritulaya-widget-installed-private`,
  `ritulaya-widget-restored` (`.xml` and `.png`)
- `ritulaya-private-draft-restored.xml`, `ritulaya-private-editor-windows.txt`
- `ritulaya-release-{en-US,en-GB,en-IN,hi,ja,ko}` (`.xml` and `.png`)
- `ritulaya-release-hi-large-setup.png`, `ritulaya-final-qa-process.log`
