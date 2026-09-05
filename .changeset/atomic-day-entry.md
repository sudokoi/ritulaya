---
"ritulaya": patch
---

Save day entries through one native transaction using persisted flow history,
instead of deciding period transitions from the JavaScript cache and issuing two
separate writes. Period fills now retain their chosen cycle association and
preserve symptoms and other fields on existing entries.

Requires a new Android build for the added native bridge command. Existing cycle
history is not automatically rebuilt or repaired.
