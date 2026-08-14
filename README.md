<p align="center">
  <img src="assets/images/icon.png" alt="Ritulaya logo" width="120" height="120" />
</p>

# Ritulaya

Privacy-first period tracker for Android. Local-first, encrypted, ambient sync. No accounts. No analytics.

## Philosophy

- **Your data lives on your device** — encrypted with a hardware-backed key that never leaves the Android Keystore
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

- **State** — one `@xstate/store` per domain (cycles, day-logs, settings, sync), read via `useSelector`. Module-level stores, no global provider.
- **Data** — expo-sqlite + Drizzle, with per-entity repositories in `src/db/`.
- **Encryption** — the SQLite file is encrypted at rest with SQLCipher; the key is a random value wrapped by an AES-256-GCM key held in the Android Keystore.
- **Sync** — a Kotlin module (`ritulaya-sync`) drives GitHub sync end-to-end (OAuth device flow, CSV merge, background WorkManager). The device copy is encrypted; the repo copy is plaintext in your private repository.
- **Native modules** — `ritulaya-crypto` (Keystore / SQLCipher key), `ritulaya-logger` (crash-surviving debug log), `ritulaya-widget` (home-screen widget).

See [docs/decisions/](./docs/decisions/) for architecture decision records.

## Versioning

Versioned with [Changesets](https://github.com/changesets/changesets). Pre-release at `0.1.0-alpha` — unstable API.

```bash
yarn changeset        # Create a changeset
yarn changeset:version  # Bump versions + update changelog
```

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).
