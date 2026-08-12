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
| State           | xstate v5 + @xstate/store                                              |
| Database        | expo-sqlite + Drizzle ORM                                              |
| Encryption      | SQLCipher with Android Keystore-managed key                            |
| Sync            | Kotlin native module — GitHub REST API, OAuth device flow, WorkManager |
| Testing         | Jest + react-native-testing-library + Maestro                          |
| Package manager | pnpm                                                                   |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm start

# Run on Android
pnpm android

# Lint, format, typecheck
pnpm lint
pnpm format
pnpm typecheck

# Run tests
pnpm test
```

## Architecture

See [docs/decisions/](./docs/decisions/) for architecture decision records.

## Versioning

Versioned with [Changesets](https://github.com/changesets/changesets). Starting at `0.1.x` — pre-release, unstable API.

```bash
pnpm changeset        # Create a changeset
pnpm changeset:version  # Bump versions + update changelog
```

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).
