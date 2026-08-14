# 0007: Yarn 4 as package manager

Date: 2026-08-12

Status: Accepted

## Context

We need a JavaScript package manager. The reference project (expense-buddy) uses Yarn 4 (Berry) with the `node-modules` linker. Options are npm, Yarn, pnpm, or Bun.

We initially chose pnpm, but hit friction with Metro's symlink resolution and Expo's local native-module autolinking. We migrated to Yarn 4 to match the reference project.

## Decision

Use Yarn 4 (Berry) with the `node-modules` linker and exact, pinned dependency versions (`defaultSemverRangePrefix: ""`). The lockfile (`yarn.lock`) and the Yarn release binary (`.yarn/releases/`) are committed.

## Consequences

- **Positive:** Matches the reference project's tooling, reducing context-switching.
- **Positive:** `yarn install --immutable` gives reproducible installs in CI.
- **Positive:** The `node-modules` linker keeps `node_modules/` hoisted, which works with Metro and Expo's native module autolinking without symlink issues.
- **Positive:** `checksumBehavior: throw` verifies cache integrity as a supply-chain protection.
- **Negative:** Commits a Yarn release binary and `.yarnrc.yml`, which some consider heavyweight.
- **Negative:** Yarn 4 (Berry) has a steeper learning curve than npm.
