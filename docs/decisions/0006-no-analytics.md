# 0006: No analytics or telemetry

Date: 2026-08-12

Status: Accepted

## Context

Period tracking is arguably the most privacy-sensitive consumer app category. Users' cycle data reveals pregnancy status, health conditions, fertility patterns, and intimate behavioral data. Several high-profile period tracker data-sharing scandals (Flo, 2023) have made "no analytics" a competitive differentiator.

The reference project (expense-buddy) also ships with zero analytics.

Options considered:

- Opt-in, anonymized telemetry (Aptabase, self-hosted)
- Zero telemetry (no network calls for analytics, ever)
- Local-only aggregate stats surfaced in a developer settings screen

## Decision

**Zero telemetry. No analytics SDKs. No network calls for analytics. No crash reporters (Sentry, Firebase Crashlytics).**

Instead, we use structured local logging (`ritulaya-logger`) that users can explicitly export and share via GitHub Issues for debugging.

## Consequences

- **Positive:** Structural privacy guarantee: "We cannot share what we never collect." This is verifiable via network audit (mitmproxy, airplane mode).
- **Positive:** Smaller APK — no analytics SDKs adding to bundle size.
- **Positive:** No GDPR/privacy policy complexity for data processing.
- **Positive:** Aligns with the competitive landscape — Ovaly, Privates, Veil, and TeenCycle all ship with zero analytics.
- **Negative:** No product usage insights. We don't know which features are used, where users drop off, or what crashes in the field without user-reported logs.
- **Negative:** Bug discovery relies on GitHub Issues and App Store reviews. No proactive crash detection.
- **Mitigation:** The `ritulaya-logger` module captures structured logs. Users can export and attach them to bug reports. This is opt-in and transparent.
