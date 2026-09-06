# Live GitHub sync verification — 2026-09-06

The initial scenarios below tested the intermediate, unshipped `ritulaya/v2/`
layout. The later flat-layout migration follow-up is recorded separately below;
it supersedes the earlier legacy-file retention decision, not those historical
observations.

## Authorization and isolation

The maintainer explicitly authorized creating a temporary **private** GitHub
repository and verifying sync, while forbidding edits or deletion of any other
repository. This supersedes the earlier prohibition only for this bounded test.

- Created `sudokoi/ritulaya-sync-qa-20260906-fbceb01d4fb4` via authenticated GitHub
  CLI, with `private=true` and an initialized `main` branch.
- Immutable repository ID: **1358748776**. Setup writes checked that ID and privacy;
  the Android harness checked the exact owner/name/ID/private state before sync.
- Seeded only synthetic legacy records and a `QA-SYNTHETIC-ONLY.txt` marker. No
  real health data, application source, credentials or production database was
  uploaded. No existing repository was edited or deleted; the app branch was not
  pushed and no app artifact was published.
- Installed a dedicated instrumentation APK,
  `com.sudokoi.ritulaya.sync.liveqa`, on the Android 16/API 36 emulator. It did not
  run inside the production app or either pre-existing QA app installation.
- Credentials were obtained from the existing GitHub CLI login without printing
  them, passed over stdin into a shell-only temporary emulator file, read by
  instrumentation and immediately removed. No token was embedded in code, APKs,
  command arguments, repository files or test output. The runner also removed
  that file in cleanup and uninstalled only its dedicated instrumentation APK.

## Native protocol scenario — passed

An Android instrumentation scenario used the actual `GithubApiClient`, Android
HTTP stack, `SyncProtocol`, `RoomSyncRepository`, native entry commands, revision
triggers and independent SQLCipher-backed databases representing three devices.
Network and persistence were not replaced with mocks. Test-only constructor
injection supplied the independent stores without changing production visibility.

Observed against the real private repository:

1. **Migration consent:** the first legacy read produced a migration review and
   did not advance the branch until approval. The imported multiline/quoted note,
   recorded No, BBT and mucus values survived.
2. **Fresh-device download:** a second store downloaded the same data; a database
   close/reopen preserved the accepted state. Biometric lock stayed device-local.
3. **Independent offline edits:** a note change and a mood change from different
   stores combined without losing either field.
4. **Same-field divergence:** conflicting notes required explicit review and did
   not publish before confirmation. A local edit invalidated the old choice;
   refreshed review and confirmation converged to the selected value.
5. **Explicit clears:** activity, BBT and mucus clears round-tripped as JSON nulls.
6. **Competing publication:** another client advanced GitHub's branch after a
   candidate was prepared. The real non-fast-forward rejection triggered a new
   merge; both independent changes survived. No force update was used.
7. **Interrupted acknowledgement:** the harness let GitHub accept publication,
   then simulated loss of the success response. The pending attempt was persisted.
   Closing/reopening the database and rerunning sync recognized the commit through
   GitHub ancestry without republishing it or losing the data.
8. **Deletion:** edit-versus-delete required review. Selecting the remote deletion
   removed the edited row; a third store that had remained offline since initial
   sync also accepted the deletion instead of resurrecting it. The remote retained
   an explicit null tombstone.
9. **Preservation:** Git blob SHAs for README, the unrelated marker and all seeded
   root-level legacy files remained unchanged. New snapshots were plaintext JSON
   under `ritulaya/v2/`; the repository remained private.

Result: **1 instrumentation scenario passed**, 126.682 seconds, with eight
reported milestone groups. Final commit for this scenario:
`1ce53f32c306809d4b9bbb4504dd3bd869f1b715`.

The interrupted-response point and competition timing were deliberately controlled
by test adapters; publication, branch rejection, ancestry checks and subsequent
reads still used GitHub. A database reopen is not an OS process-kill/reboot test.

## Native orchestrator scenario — passed

A second isolated instrumentation run used `SyncOrchestrator` with its normal
`RitulayaDataStore(context)` construction, Android Keystore-backed credential
loading and SQLCipher database. It did not replace reminder-policy installation
actions with the test-only constructor used by the independent-store scenario.

- Downloaded the existing v2 snapshot and installed its settings successfully.
- Resolved the repository's default branch and persisted the expected
  `1358748776:main` target without requiring a configured branch override.
- Reported `inSync`, with no pending action or conflict review.
- Saved a synthetic entry through the native command, synchronized it and verified
  its content through a fresh GitHub read. `syncedAt` was populated.
- Deleted that entry and verified the remote explicit tombstone and `inSync`
  status. Removed the stored credential in cleanup; uninstalling the dedicated
  harness removed its private database and app-scoped Keystore material.

Result: **1 additional instrumentation scenario passed**, 20.696 seconds. Final
branch commit: `0822e4d5048401d3b8dec53c5af08371918f45a6`. A separate GitHub CLI
read verified the exact repository ID, private visibility, final head and only
the expected nine fixture/protocol files. The temporary credential file and
instrumentation package were confirmed absent afterward.

No production code defect was exposed by these two live scenarios. They are not
a substitute for the untested flows listed below.

## Flat-layout migration follow-up — passed

After the maintainer approved deleting legacy files and dropping the unshipped
directory layout, the native protocol scenario was rerun on
`qa/flat-layout-20260906` in the **same** private QA repository. No second
repository was created. The branch starts at the original synthetic legacy seed
`107311b785b998e5c3935e5bfc1439aa94819cac`, leaving the earlier QA `main` head and
its evidence untouched.

The new instrumentation scenario passed in **140.16 seconds**. It repeated
migration consent, data preservation, fresh-device download, independent edits,
conflict/stale-choice handling, nullable clears, real competing publication,
acknowledgement recovery and offline deletion. It additionally checked that the
legacy files were absent and the flat JSON files present immediately after
migration and at the end.

A separate GitHub API read verified the first migration commit
`8e1c36c1852a1c933811e8d55ce2f07a3f984d7d` has the exact seed as its sole parent.
Both its tree and the final tree at
`2d5e3294e0183b0f26c894bc563837fb9c3b1cae` contain exactly:

```text
README.md
QA-SYNTHETIC-ONLY.txt
ritulaya-sync-manifest.json
ritulaya-sync-cycles.json
ritulaya-sync-day-logs.json
ritulaya-sync-settings.json
```

The missing legacy settings file was not submitted as a nonexistent deletion.
Unrelated blob SHAs stayed unchanged; repository ID/private visibility and the
unchanged previous `main` head were rechecked. The credential file and dedicated
instrumentation package were confirmed removed. The test repository/branch stay
private for inspection. No other repository was modified by this live test.

Local evidence: `ritulaya-flat-live-{build.log,results.log,repo.json,final.json}`
under the approved temporary directory. The orchestrator and app-UI scenarios
were not rerun for this layout-only amendment; do not attribute the earlier
orchestrator result to a new run.

## Remaining limits

This verifies native synchronization with real GitHub, not the complete browser
OAuth/device-code or React Native review-screen flow. GitHub CLI authentication
and repository creation were used for setup. It does not establish WorkManager
scheduling across Doze/reboot, real rate limiting, multi-device physical behavior
or app-store release readiness. The existing hermetic tests remain separate and
do not acquire live credentials or create repositories.

The temporary repository is retained **private** for maintainer inspection. No
repository deletion was performed.

## Local evidence

Under the approved session `T/opencode` directory:

- `ritulaya-live-repo.json`: non-secret repository identity.
- `ritulaya-live-create.py`, `ritulaya-live-run.py`: guarded setup/execution.
- `ritulaya-live.init.gradle`, `ritulaya-live-manifest.xml`, `ritulaya-live-src/`:
  external, opt-in instrumentation harness. Its compile SDK is 36, matching the
  host app and the resolved AndroidX requirement; product sources were unchanged.
- `ritulaya-live-build.log`, `ritulaya-live-results.log`: build and live scenario
  results. These live results are not added to the routine 79 native unit tests.
- `ritulaya-live-orchestrator-build.log`, `ritulaya-live-orchestrator-results.log`:
  normal native orchestration results.
- `ritulaya-live-final-check.json`: non-secret final repository verification.
