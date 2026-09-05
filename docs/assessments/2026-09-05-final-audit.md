# Final branch audit — 2026-09-05

Baseline approved by the maintainer: `main` at `dc7003d`, reviewed with
`git diff main...HEAD` through `1656c58`, then rechecked against the audit fixes.
Requirements came from the approved conversation, `CONTRIBUTING.md`, accepted
ADRs, the codebase assessment, and `docs/design/ui-refresh.md`. Standards and
requirements were reviewed independently. This is a bounded branch audit, not
a claim that every previously documented risk is resolved.

## Standards

Four findings were addressed:

1. **P2 — Dark privacy disclosure contrast:** explicitly theme Markdown inline
   code and links; use the owned back control and a wrapping heading.
2. **P2 — Stale Today entry after midnight:** select the entry using the refreshed
   focus date rather than the store's last-loaded `todayLog` field.
3. **P2 — Missing accessible History context:** include non-discreet result context
   in the accessible label, with neutral text and no sensitive preview in discreet
   mode.
4. **P3 — Bootstrap control ownership:** use the shared Button/AppText primitives
   and a themed spinner, preserving the retry workflow.

The standards reviewer rechecked all four fixes and found no further actionable
regressions within that scope. The stale README database table was also corrected
from expo-sqlite/Drizzle to Room/SQLCipher.

Standards summary: **4 findings addressed**; the highest-severity findings were
P2, including the stale Today entry and inaccessible result context.

## Requirements

Three findings drove fixes:

1. **P1 — No-cycle suppression incomplete:** the prediction bridge publishes no
   app-facing dates without a usable current cycle. Calendar retains recorded
   markers, and reminder reconciliation retains daily logging without inventing
   a period date. Native widget snapshot/live paths now show neutral Today text
   without day, phase, or countdown when the cycle is missing or in the future.
   Widget refresh observes completed bundles even when the prediction remains
   null, so newly localized neutral snapshots still reach the widget. Prediction
   algorithms and persisted history are unchanged.
2. **P1 — Authentication/background race:** the maintainer approved a focused
   native authentication module after review caught that a JS-only background
   guard also rejected legitimate Android PIN/password returns. `ritulaya-auth`
   revokes completed grants on native pause and cancels unfinished biometric
   requests when leaving, while permitting its explicitly owned system credential
   request to complete before or after resume. The gate checks the native grant
   synchronously before showing protected content. Tokens are ephemeral, never
   persisted, synced or logged. The AndroidX dependency matches the version already
   supplied by pinned Expo LocalAuthentication; that package remains for Settings
   hardware/enrollment checks and was not patched or upgraded.

   Follow-up review also caught automatic re-prompting after credential cancellation;
   the gate now keeps that return locked until explicit Unlock. The final focused
   requirements recheck found no remaining concrete defect in these fixes.

3. **P2 — Missing prediction accepted as startup success:** require the native
   module and reject missing results/bundles, allowing the existing fail-closed
   bootstrap/retry path to handle failures.

No confirmed scope creep was reported. Historical cycle reconciliation, tri-state
migration, settings/tombstone sync races, and full discreet-mode policy remain
explicitly deferred, not silently redefined by the audit fixes.

Requirements summary: **3 original findings addressed**, plus both regressions
caught during authentication-fix review. Highest severity: P1 authentication
freshness and unanchored predictions. This is not a security certification.

## Validation and release limits

- 134 JS/React tests in 24 suites pass. New tests cover application event ordering,
  midnight selection, accessible previews, bridge completion/anchoring, and daily
  reminder preservation. History test timers are drained inside `act` to avoid
  leaking virtual-list updates between tests. No new tests assert external
  encryption, transaction, keyboard, biometric, or list-library guarantees.
- Typecheck, ESLint/ktlint, formatting and diff checks pass. Database, prediction,
  and sync Kotlin test tasks were explicitly rerun successfully, not just accepted
  from cached test results.
- Four additional Kotlin authentication-policy tests pass, covering grant expiry,
  unfinished biometric invalidation, owned credential completion before/after
  resume, and cancelled/replaced requests. Ten React gate tests cover completion,
  cancellation, relocking, retry and unmount behavior at the native boundary.
- An ARM64 release-mode APK builds successfully at
  `android/app/build/outputs/apk/release/app-release.apk`. Its manifest was checked:
  package **`com.sudokoi.ritulaya`**, `allowBackup=false`. This local artifact uses
  the generated project's debug signing configuration; it is **not** the final
  Play-signed/multi-ABI release. It was not installed over any app.
- Expo Doctor remains 20/21 with the same 15 deliberately retained Expo/RN patch
  mismatches. No upgrade or warning suppression was made.
- Android 16 isolated debug QA: the notes-only Calendar showed its recorded dot
  but no predicted/fertile/ovulation markers; the dark Privacy Policy's inline
  `repo` disclosure was readable. Existing synthetic records were not edited.
  These checks do not validate the updated native widget on a host or the
  authentication race on real biometric/device-credential hardware.
- A newly created, separate Android 16 emulator (`Ritulaya_Auth_QA`, port 5556)
  with a rebuilt `.qa` app verified fingerprint unlock, Home/resume relocking,
  successful PIN fallback, PIN cancellation staying locked without a prompt loop,
  and leaving during a fingerprint prompt staying locked on return. It contained
  no health records or GitHub configuration. Its temporary PIN/fingerprint never
  touched the original emulator's Keystore; this temporary AVD was shut down and
  deleted after QA. Screenshots/XML remain in the approved temporary evidence
  directory as `ritulaya-auth-*`. These are debug-emulator observations, not
  physical/OEM or installed-release evidence.
- Theme/language are System, discreet mode Off, font scale 1.0, density 420,
  hardware-keyboard IME display 0, and handwriting preference unset. Original
  app/data and unrelated port 8081 were untouched; owned QA Metro remains on 8082.
- Full TalkBack traversal, installed-release/physical-device tests, broader device
  credential lifecycle, other keyboards/OEMs, native widget host, notification
  delivery, backup/transfer and live-sync checks remain release follow-ups. No
  conclusion about the reported Pixel 8 Pro / Android 17 crash is supported.

Release notes are consolidated into the single minor changeset
`.changeset/ui-refresh-and-hardening.md`, retaining native rebuild and syncing
device upgrade requirements. GitHub CSV/JSON stays human-readable plaintext;
on-device SQLCipher encryption, the production package name, and the reviewed
HTML design artifact are unchanged.
