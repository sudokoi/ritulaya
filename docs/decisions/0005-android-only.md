# 0005: Android-only platform target

Date: 2026-08-12

Status: Accepted

## Context

The app must target Android initially. iOS support is not in scope for the foreseeable future. Expo defaults to building for both platforms, and the scaffolded template includes web as well.

## Decision

Set `platforms: ["android"]` in app.json. Remove web-specific and iOS-specific template files. All native modules declare `"platforms": ["android"]` in their `expo-module.config.json`.

## Consequences

- **Positive:** Smaller dependency surface — no iOS-specific modules, no web polyfills.
- **Positive:** Kotlin-only native modules, no Swift/Xcode maintenance burden.
- **Positive:** EAS Builds are faster (single platform).
- **Positive:** Widget development targets Android's `AppWidgetProvider` API without needing to implement iOS WidgetKit.
- **Negative:** If iOS support is added later, we need to implement Obj-C/Swift equivalents of the 4 native modules.
- **Negative:** Some React Native libraries assume multi-platform — we've removed web-specific files that might trigger import errors if those libraries are loaded in a web context.
