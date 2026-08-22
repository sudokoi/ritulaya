---
"ritulaya": patch
---

Restrict Android to arm64 and fix release-only failures

- Restrict Android artifacts to arm64-v8a via expo-build-properties buildArchs so EAS emits single-ABI AABs/APKs
- Bind i18next to react-i18next via initReactI18next and disable suspense so useTranslation resolves bundled resources instead of returning raw keys in release builds
