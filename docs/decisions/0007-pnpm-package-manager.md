# 0007: pnpm as package manager

Date: 2026-08-12

Status: Accepted

## Context

We need a JavaScript package manager. The reference project (expense-buddy) uses Yarn 4 (Berry) with the `node-modules` linker. Options are npm, Yarn, pnpm, or Bun.

Starting with Expo SDK 54, Expo officially supports isolated dependencies (pnpm and Bun). The Expo team uses pnpm internally. Historical compatibility issues with Metro's symlink resolution have been resolved.

## Decision

Use pnpm with its default isolated dependency installation strategy (`node_modules/.pnpm` virtual store with symlinks). No `nodeLinker: hoisted` workaround needed — supported natively by Expo SDK 57.

## Consequences

- **Positive:** Faster installs than npm/Yarn due to hard-linked global store.
- **Positive:** Strict dependency isolation — packages can only access their declared dependencies, preventing accidental imports of transitive deps.
- **Positive:** Lower disk usage — packages are stored once globally, symlinked per project.
- **Positive:** `pnpm-workspace.yaml` gives us monorepo support if we add a companion app or shared package layer later.
- **Positive:** No `.yarn/` directory to track in version control (Yarn Berry requires this).
- **Negative:** Some older React Native libraries may not work with isolated installs. If we hit this, the escape hatch is `nodeLinker: hoisted` in `.npmrc`.
- **Negative:** pnpm's lockfile format is different from npm/yarn. CI must use `pnpm install --frozen-lockfile` instead of `npm ci`.
