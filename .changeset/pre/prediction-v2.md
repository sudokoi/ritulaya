---
"ritulaya": minor
---

Prediction engine v2, widget theming, and live sync status

- Predictions weight each cycle by recency and similarity to the user's own typical pattern (median/MAD), so irregular cycles damp out without discarding data or using population heuristics
- Confidence now reflects both history volume and regularity; predictions expose an ~80% uncertainty window around the next period start
- History older than 90 days resets predictions to population defaults
- Phase boundaries derive from the user's configured period and luteal lengths instead of hardcoded day thresholds
- The home-screen widget renders the app's persisted prediction snapshot (no more widget/app divergence) and follows the system light/dark theme
- Sync status is a real state machine persisted through background syncs, with live updates in the app while it's open
