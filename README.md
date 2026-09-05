<p align="center">
  <img src="assets/images/icon.png" alt="Ritulaya logo" width="120" height="120" />
</p>

# Ritulaya

Privacy-first period tracker for Android. Local-first, encrypted, ambient sync. No accounts. No analytics.

## Get the app

Ritulaya is in closed testing on Google Play. Join the test to install the latest build and help shape what comes next:

- [Google Play](https://play.google.com/store/apps/details?id=com.sudokoi.ritulaya)
- [Join the closed test](https://play.google.com/apps/testing/com.sudokoi.ritulaya)

## Philosophy

- **Your data lives on your device** — encrypted with a database key wrapped by an Android Keystore key
- **Sync is optional and automatic** — connect your own GitHub repo, it syncs silently in the background
- **No telemetry, no tracking, no third-party SDKs** — structurally enforced, not just promised
- **Phase-aware design** — the app's visual language shifts with your cycle, in calm muted tones

## Tech Stack

| Layer           | Choice                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| Framework       | Expo SDK 57, React Native 0.86, TypeScript                             |
| Routing         | expo-router (file-based)                                               |
| Styling         | NativeWind 4 (Tailwind CSS) + react-native-reusables                   |
| State           | @xstate/store                                                          |
| Database        | expo-sqlite + Drizzle ORM                                              |
| Encryption      | SQLCipher at rest, Keystore-wrapped random key                         |
| Sync            | Kotlin native module — GitHub REST API, OAuth device flow, WorkManager |
| Testing         | Jest + react-native-testing-library                                    |
| Package manager | Yarn 4                                                                 |

## Getting Started

```bash
# Install dependencies
yarn install

# Start the dev server
yarn start

# Run on Android
yarn android

# Lint, format, typecheck
yarn lint
yarn format
yarn typecheck

# Run tests
yarn test

# Build a local APK
yarn build:android:local
```

## Architecture

- **State** — one `@xstate/store` per domain (cycles, day-logs, settings, sync, predictions), read via `useSelector`. Module-level stores, no global provider.
- **Data** — Room + SQLCipher behind `RitulayaDataStore` in `modules/ritulaya-db/`; `src/services/db.ts` is the JS bridge client.
- **Day entries** — `src/domain/day-entry.ts` owns save/delete/clear-flow commands and their post-write refresh. `useDayEditor` connects screens to those commands; `useDayLogs` reads the cache rather than exposing another mutation path.
- **Encryption** — the SQLite file is encrypted at rest with SQLCipher; the key is a random value wrapped by an AES-256-GCM key held in the Android Keystore.
- **Sync** — a Kotlin module (`ritulaya-sync`) drives GitHub sync end-to-end (OAuth device flow, CSV merge, background WorkManager). The device copy is encrypted; the repo copy is plaintext in your private repository.
- **Native modules** — database, crypto, predictions, sync, local logging, and home-screen widget under `modules/`.

See [docs/decisions/](./docs/decisions/) for architecture decision records.

For enhancement planning, start with the latest
[codebase assessment](./docs/assessments/2026-09-05-codebase-assessment.md) rather
than repeating the repository survey.

## Entry history (unreleased)

From Today or Calendar, choose **Search history** to browse recorded entries,
newest first. Search note text or expand the filters to choose a symptom, mood,
or inclusive date range. Dates use `YYYY-MM-DD`; a blank date leaves that end
unrestricted. Filters combine, and **Clear filters** resets them all.

Tap a result to edit it. Saved changes and deletions update the results without
resetting the current filters. Discreet mode hides result details until you open
an entry. Search queries remain in screen memory; the app does not save them or
send them to a search service. This is a view of recorded entries, not predictions
or a claim that automatically filled days were individually observed.

## Versioning

Versioned with [Changesets](https://github.com/changesets/changesets). See `package.json` for the current version and `CHANGELOG.md` for release history.

```bash
yarn changeset        # Create a changeset
yarn changeset:version  # Bump versions + update changelog
```

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).
