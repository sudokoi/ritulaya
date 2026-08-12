# 0001: Expo SDK 57 as the application framework

Date: 2026-08-12

Status: Accepted

## Context

We need to choose an application framework for a privacy-first period tracker targeting Android. The options are bare React Native, Expo managed workflow, or Expo with development builds.

Expo SDK 57 is the latest stable release (August 2026), built on React Native 0.86 with the New Architecture enabled by default. It includes React Compiler support, typed routes, and first-class support for pnpm isolated dependencies.

## Decision

Use Expo SDK 57 with the managed workflow, using development builds (not Expo Go).

## Consequences

- **Positive:** File-based routing via expo-router, typed routes, built-in splash screen, OTA updates via EAS, and a large ecosystem of compatible modules.
- **Positive:** New Architecture enabled by default — Fabric renderer, TurboModules, JSI — better performance on Android.
- **Positive:** React Compiler reduces unnecessary re-renders.
- **Positive:** Expo's autolinking discovers custom native modules in `modules/` automatically, no manual Gradle wiring needed.
- **Negative:** SDK 57 is new — some third-party libraries may not have released compatible versions yet. We accept this risk for a greenfield project.
- **Negative:** Expo Go is not compatible with custom native modules (Kotlin). We must use development builds, which adds ~2 min to first-run setup.
