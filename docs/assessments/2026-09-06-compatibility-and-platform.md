# Compatibility and Android platform follow-up

## Dependency decision

The historical React Native downgrade (`d075c29`) addressed an actual SDK mismatch:
RN 0.87 removed `rn-get-polyfills`, which Expo 57's Metro configuration expected.
It was not a requirement to retain patch 0.86.2 indefinitely. The subsequent
`bf9dea9` commit made exact version pinning intentional. Both decisions remain:
use Expo SDK 57 / RN 0.86, and keep exact package versions.

The SDK 57 documentation targets RN 0.86 and React 19.2.3. The installed Expo
compatibility checker recommended fifteen patch updates. These were applied
explicitly, not by upgrading every dependency or suppressing validation:

| Package                 | Before  | After   |
| ----------------------- | ------- | ------- |
| `@expo/ui`              | 57.0.13 | 57.0.16 |
| `expo`                  | 57.0.16 | 57.0.20 |
| `expo-build-properties` | 57.0.14 | 57.0.17 |
| `expo-constants`        | 57.0.14 | 57.0.17 |
| `expo-file-system`      | 57.0.5  | 57.0.6  |
| `expo-font`             | 57.0.1  | 57.0.3  |
| `expo-haptics`          | 57.0.1  | 57.0.2  |
| `expo-image`            | 57.0.3  | 57.0.4  |
| `expo-linking`          | 57.0.7  | 57.0.9  |
| `expo-notifications`    | 57.0.14 | 57.0.17 |
| `expo-router`           | 57.0.16 | 57.0.19 |
| `expo-sharing`          | 57.0.15 | 57.0.18 |
| `expo-system-ui`        | 57.0.2  | 57.0.3  |
| `react-native`          | 0.86.2  | 0.86.3  |
| `jest-expo`             | 57.0.4  | 57.0.5  |

`yarn expo install --check` reports dependencies up to date; Expo Doctor passes
**21/21** checks. Typechecking and the full application/native test command pass.
Yarn still reports upstream transitive peer declarations (for example Expo CLI
and Babel/Jest dependency edges); these are not suppressed or repaired with
speculative package extensions. NativeWind 4, React, Reanimated and AndroidX
biometric pins remain unchanged.

References:

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- Repository commits `d075c29`, `bf9dea9`, and the checked-in `yarn.lock`

## Android backup and transfer policy

Android documents that `allowBackup=false` does not necessarily disable
device-to-device transfer on every manufacturer's Android 12+ implementation.
The app now also declares explicit exclusion rules for every supported private,
external-app and device-protected storage domain. Legacy full-backup rules and
modern cloud/device/cross-platform transfer rules exclude the entire domain.
The cross-platform exclusion does not add an iOS app or restore feature.

The Expo manifest plugin references resources owned by the existing database
module, so prebuild does not erase the policy. Production identity stays
`com.sudokoi.ritulaya`. On-device data remains SQLCipher encrypted and bound to
the device Keystore. User-requested GitHub synchronization remains human-readable
plaintext CSV/JSON, independent of Android backup.

Reference: [Android Auto Backup documentation](https://developer.android.com/identity/data/autobackup).

Validation: Expo prebuild and ARM64 release-mode assembly succeeded with the new
SDK patch matrix. `apkanalyzer manifest print` confirms the production package,
disabled backup and both XML references in the final APK. AAPT2 resolved the
shrunken resource paths; decoded XML contains all nine exclusions in legacy,
cloud, device and cross-platform sections. No library backup-guarantee test was
added: these checks validate Ritulaya's declared and packaged policy.

## Evidence limits

Local release-mode builds use debug signing, not production signing. They are
build evidence only. Physical/OEM transfer behavior, Play signing, multi-ABI
delivery, and the reported Android 17 crash remain unverified. No live GitHub
testing, publishing, production installation, or original-app data access is
authorized or performed.
