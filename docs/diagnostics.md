# Local diagnostics

Diagnostics remain on-device until the user chooses **Settings → Report Bug**.
That action prepares clipboard text for review; it does not submit an issue or
upload logs automatically. There is no telemetry or analytics service.

## Allowed content

`src/services/diagnostic-metadata.ts` projects errors before the native bridge.
`DiagnosticPolicy.kt` independently projects the full record before storage and
again before export, including records written by older versions.

- Severity: `debug`, `info`, `warn`, or `error`.
- Operation: only known tag/message pairs for bootstrap, refresh, widget,
  reminders, authorization, repository setup and sync. Unknown pairs become
  `app: Diagnostic details omitted`; free-text messages and tags are not retained
  by new writes or emitted from old rows.
- `errorType`: a finite set of standard JavaScript error names, or `UnknownError`
  / `NonError`. Custom names are not copied.
- `errorCode`: explicitly listed Expo bridge and app sync categories. Arbitrary
  code strings are not copied.
- `httpStatus`: explicitly listed HTTP failure status integers. Strings and other
  numbers are rejected rather than coerced.
- Export header: format version, numeric installed app version and Android API
  level, with records ordered newest first. No device identifier or model.

Raw exception messages, stack traces, paths, URLs, repository names, tokens,
health fields, dates and nested causes are **not** diagnostic fields. The JS
projection does not invoke an error's `toJSON` or traverse its cause. Malformed or
oversized native metadata is omitted. Historical diagnostic rows are not deleted
or rewritten by a database migration; their exports use the current projection.

This intentionally trades unrestricted stacks/messages for a smaller, predictable
report. Reproduction steps and additional context still come from the user.
The existing 1,000-entry retention limit is unchanged; no database schema change
is required. The native policy requires a rebuilt Android app.

## Maintaining the contract

Add a new event or technical category only after checking that **both its key and
possible values** cannot carry personal data. Extend the explicit policies and
their boundary tests; do not replace them with permissive string patterns or
generic object serialization. A new call-site message is omitted until its pair
is allowed by the native policy.

Regression coverage:

- `src/__tests__/unit/logger.test.ts`: useful error context at the bridge, nested
  sensitive content exclusion, arbitrary names/codes, custom serialization,
  throwing getters and non-fatal native rejection.
- `modules/ritulaya-logger/android/src/test/java/expo/modules/ritulayalogger/DiagnosticPolicyTest.kt`:
  pre-storage projection, legacy export safety, strict values/types, malformed
  input, environment header and the known event catalogue.

These test Ritulaya's disclosure policy, not Room or JSON-library guarantees.
