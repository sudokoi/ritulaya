---
"ritulaya": patch
---

Prevent protected routes and widget editors from opening before local data loads.
Keep failed edits open, propagate settings failures, and separate cycle-length
adjustments from period seeding. Remove the unauthenticated app-lock bypass.

Stop widget/prediction feedback, request notification permission only when enabling
reminders, honor disabled overdue reminders, and disable Android automatic backup.

Retain remote deletion tombstones, retry transient background sync failures, bound
GitHub network waits, and reject malformed CSV headers and basic row structure.
GitHub sync remains human-readable plaintext by design.

Include all cycle/day-log fields in CSV exports, fix repeated symptom/mood counts,
and add lifecycle, editor, reminder, and sync regression coverage.
