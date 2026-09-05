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
