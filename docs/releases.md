# Android releases

Ritulaya is publicly available on
[Google Play](https://play.google.com/store/apps/details?id=com.sudokoi.ritulaya).

## Publishing

1. Add a Changeset for release-note-worthy changes. The versioning workflow opens
   a release PR that updates `package.json` and `CHANGELOG.md`.
2. Merge the release PR. The Changesets workflow creates the matching `v*` tag,
   which starts `.github/workflows/release.yml`.
3. The release workflow runs CI, builds an internal-distribution APK and a
   production AAB, and checks both artifacts for 16 KB native-library alignment.
4. The production build submits its AAB using the `production` submit profile in
   `eas.json`: Play track `production`, release status `completed` (full rollout),
   with changes sent for review. Google Play review and any managed-publishing
   setting in Play Console still govern when users receive the update.
5. After both build jobs succeed, the workflow creates a GitHub Release containing
   the APK and AAB.

The workflow uses `EXPO_TOKEN` and the Android signing and Google Play service
account credentials configured in EAS. The service account needs permission to
release to production. Version codes are derived from `package.json` by
`app.config.js`; each published update needs a higher version.

A manual workflow run on a branch builds and checks artifacts without submitting
or creating a GitHub Release. A run on a `v*` tag follows the publishing path.
The `internal` build profile names the downloadable APK; it does not choose the
Play destination. The `internal` submit profile remains available for deliberate
test-track submissions.

## 16 KB page-size checks

Android memory page alignment is distinct from SQLCipher's database page size.
The release check validates the packaged native binaries rather than relying on
the Expo SDK or NDK version alone:

- Every packaged ARM64/x86-64 `.so` must have 16 KB-compatible ELF LOAD segments.
- Uncompressed native libraries in APKs must start on 16 KB ZIP boundaries.
- AAB configuration must explicitly request `PAGE_ALIGNMENT_16K`, verified using
  bundletool. ZIP offsets inside an AAB are not APK installation offsets.

Run the same checks locally (Python 3; Java and bundletool for an AAB):

```bash
python3 scripts/check-android-page-size.py path/to/app.apk
python3 scripts/check-android-page-size.py path/to/app.aab --bundletool path/to/bundletool.jar
```

The workflow downloads bundletool 1.18.3 and verifies its SHA-256 before use.
The check must pass before artifact upload and Play submission.

For device validation, use a 16 KB Android emulator/device and confirm
`adb shell getconf PAGE_SIZE` returns `16384`. Check cold launch, opening an
existing encrypted database after upgrade, saving/reopening entries, and
background database access. Binary alignment checks do not replace runtime QA.

### SQLCipher dependency

The published 0.2.2 APK and AAB contain an unaligned
`arm64-v8a/libsqlcipher.so` from
`net.zetetic:android-database-sqlcipher:4.5.4`: all three ELF LOAD segments have
4096-byte alignment. The other 25 ARM64 libraries pass the LOAD alignment check.
APK ZIP alignment and the AAB's `PAGE_ALIGNMENT_16K` setting already pass.

The replacement is `net.zetetic:sqlcipher-android:4.17.0`, initialized with
`System.loadLibrary("sqlcipher")` and Room's `SupportOpenHelperFactory`.
The database name, UTF-8 passphrase bytes, Keystore key storage, Room schema and
migrations remain the same. This is a native dependency change and requires a
new APK/AAB. Do not change `cipher_page_size`, recreate the database, or enable
destructive migration to address Android memory alignment.

Version 4.17.0 is pinned with its AndroidX SQLite 2.6.2 dependency. SQLCipher 4.18+
requires compile SDK 37, whereas Expo SDK 57 uses compile SDK 36; revisit this pin
when upgrading the Expo/Android toolchain.

### Verification — 2026-09-22

- The artifact checker rejects the published 0.2.2 AAB specifically for
  `libsqlcipher.so`, while accepting its bundle alignment configuration.
- Rebuilt ARM64 release-mode APK and AAB pass all 26 native-library checks;
  the APK also passes Android SDK `zipalign -c -P 16 4`.
- On an isolated Android 16 emulator reporting `PAGE_SIZE=16384`, a temporary
  instrumentation harness opens a synthetic Room v3 database created with the
  old SQLCipher 4.5.4 library on a 4 KB emulator. It uses the rebuilt app's actual
  `RitulayaDatabase.getInstance` and Keystore-wrapped key path, verifies the old
  entry, writes an update, closes the connection and verifies the update after
  reopening. The release-mode app then cold-launches to Today successfully.
- All native unit-test tasks, ESLint/ktlint, formatting and release workflow
  validation (`actionlint`) pass.

These local builds use debug signing. Play-signed delivery, physical-device QA
and background-sync runtime behavior were not exercised by this check. The Play
Console warning must be rechecked after the corrected bundle is uploaded.

References:

- [Android 16 KB page-size support](https://developer.android.com/guide/practices/page-sizes)
- [SQLCipher Android migration guide](https://www.zetetic.net/sqlcipher/sqlcipher-for-android-migration/)
- [EAS Submit configuration](https://docs.expo.dev/eas/json/#android-specific-options-1)
