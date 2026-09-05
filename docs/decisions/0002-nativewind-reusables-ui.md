# 0002: NativeWind + react-native-reusables as UI layer

Date: 2026-08-12

Status: Accepted

> Implementation note (2026-09-05): the application currently pins NativeWind
> 4.2.6, not the originally proposed version 5. Owned UI primitives are covered
> by ADR-0011. This note does not authorize a dependency upgrade.

## Context

We need a styling and component system for the UI. The reference project (expense-buddy) uses Tamagui, but we evaluated alternatives for a more minimal, agent-friendly stack.

Options considered:

- **Tamagui** (~75k weekly downloads): Optimizing compiler, universal RN+web. Heavy dependency, lock-in to its component model.
- **NativeWind** (~1.2M weekly downloads): Tailwind CSS for React Native, compile-time styling, zero runtime cost. Styling only — no components.
- **react-native-reusables** (8.4k stars): shadcn/ui port for React Native. Copy-paste owned components built on NativeWind. Agent-friendly (source in repo, not black box).
- **React Native Paper** (~337k weekly downloads): Material Design 3. Battle-tested, 30+ components, strong a11y. But MD3 aesthetic, installed dependency.

## Decision

Use NativeWind 5 for styling and react-native-reusables for component primitives.

## Consequences

- **Positive:** Tailwind utility classes give fast iteration. Components are copy-pasted into our repo — the AI agent can read and edit them directly.
- **Positive:** Zero runtime styling cost — NativeWind compiles to native StyleSheet objects at build time.
- **Positive:** react-native-reusables provides shadcn-quality Button, Card, Input, Dialog, Switch, Tabs, etc. that we customize with our design tokens.
- **Positive:** No lock-in to a design system (like Material). Our phase-aware, warm-toned aesthetic is built on top of unstyled primitives.
- **Negative:** Requires NativeWind + Tailwind CSS configuration (global.css, tailwind.config.js, metro.config.js). More config surface than a single library import.
- **Negative:** react-native-reusables requires `@rn-primitives/portal` for overlay components (Dialog, Sheet). Adds a PortalHost to the root layout.
