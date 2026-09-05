# Privacy Policy

Ritulaya is a privacy-first period tracker. This policy explains what data the app stores and how it is protected.

## Local-first storage

All cycle and day-log data is stored locally in an encrypted SQLite database on your phone. The database is encrypted at rest with SQLCipher, using a random key wrapped by an Android Keystore key. Hardware backing depends on your device; the app does not require or verify it.

Android automatic cloud backup is disabled because the device's Keystore keys cannot be restored with backed-up files. Keep a user-controlled copy through optional GitHub sync or export if you need one. Device-transfer behavior still depends on Android and the device manufacturer.

## No accounts, no analytics

Ritulaya has no application accounts, no telemetry, no analytics SDKs, and no third-party trackers. We do not collect or sell your data. Network transfer occurs only for the optional GitHub authorization and sync you enable.

## Optional GitHub sync

If you choose, you can sync your data to a private GitHub repository that you own and control. When enabled:

- Your data is uploaded as human-readable plaintext CSV and JSON files to your repository. This is intentional; the repository copy is not encrypted by Ritulaya.
- You are responsible for the privacy settings of that repository.
- Syncing is off by default and can be disabled at any time.
- GitHub authorization uses the classic `repo` scope, which can grant access to repositories beyond the one you select for Ritulaya. You can revoke access in GitHub's settings.

## User-initiated sharing

Export creates plaintext CSV copies of cycle and daily-log records for sharing through Android. Report Bug prepares local diagnostic information for you to share. Copies you share are controlled by you and the receiving app or recipient, not by Ritulaya.

## Data stored

- Cycle start and end dates
- Daily logs (flow intensity, symptoms, mood, notes, cervical mucus, basal body temperature, sexual activity)
- App settings (cycle length, reminders, theme, and similar preferences)

## Permissions

The app requests notifications only to schedule optional period and daily-log reminders. It does not access your contacts, location, camera, microphone, or other sensitive data.

## Data deletion

Delete the app to remove all locally stored data. If you have enabled GitHub sync, delete the repository (or its files) separately — the app does not delete data from GitHub automatically.

## Changes to this policy

This policy may be updated from time to time. The latest version is always available in the app's settings.

## Contact

For privacy questions or bug reports, open an issue in the [Ritulaya repository](https://github.com/sudokoi/ritulaya).
