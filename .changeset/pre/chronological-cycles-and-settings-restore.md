---
"ritulaya": patch
---

Chronological cycle derivation and sync-restore fixes

- Derive cycle boundaries from recorded flow dates instead of entry order, so a backdated period lands in the correct cycle
- Fix the negative average-cycle length and the "every day predicted" markers caused by out-of-order periods
- Replace the solid fertile fraction fill with a translucent full-circle gradient and a calmer palette
- Restore synced settings on a fresh install instead of overwriting them with defaults
