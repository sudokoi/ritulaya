# Privacy Policy

Ritulaya is a privacy-first period tracker. This policy explains what data the app stores and how it is protected.

## Your data never leaves your device

All cycle and day-log data is stored locally in an encrypted SQLite database on your phone. The database is encrypted at rest with SQLCipher, using a key that is wrapped by a hardware-backed key in the Android Keystore and never leaves the device.

## No accounts, no analytics

Ritulaya has no accounts, no telemetry, no analytics SDKs, and no third-party trackers. We do not collect, transmit, or sell any of your data.

## Optional GitHub sync

If you choose, you can sync your data to a private GitHub repository that you own and control. When enabled:

- Your data is uploaded as plaintext CSV files to your repository.
- You are responsible for the privacy settings of that repository.
- Syncing is off by default and can be disabled at any time.

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
