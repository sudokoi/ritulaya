---
"ritulaya": minor
---

- Add on-device entry history with note search and inclusive date, symptom, and
  mood filters. Editing refreshes results without resetting filters; queries stay
  in memory, accessible results include context, and discreet previews hide details.
- Refresh Today, Calendar, History, Settings, and the shared editor with consistent
  light/dark themes, readable estimates, centered statistics and controls, and
  direct logging actions. Keep tabs free of press animation. Improve keyboard
  visibility, retain collapsed tracking fields and failed drafts, and update dates
  when switching among the six supported locales. Explain missing cycle data
  without fabricated Calendar, reminder, or widget predictions; calculate cycle
  days using local dates and refresh Today's entry selection after midnight.
- Save entries through one native transaction using persisted flow. Preserve
  existing fields and cycle associations during period fill; clear flow without
  overwriting other fields. All editors await shared persistence/refresh commands.
- Gate protected routes on successful initialization, reject missing prediction
  results and stale authentication successes after backgrounding, remove the
  unauthenticated lock bypass, prevent widget/prediction feedback, and request notification
  permission only when enabling reminders. Guard pending settings writes, separate
  cycle-length editing from seeding, and disable Android automatic backup.
- Retain sync deletion tombstones, retry transient failures, bound network waits,
  and reject malformed CSV headers/basic rows. Export all current cycle/day-log
  fields and correct accumulated symptom/mood counts.

**Upgrade:** requires a rebuilt Android app for the new native command, not a
JS-only update. Upgrade all syncing devices to preserve deletion handling.
Existing cycle history is not automatically reconciled or repaired. No database
schema or sync-format migration; GitHub CSV/JSON remains human-readable plaintext
by design, while on-device SQLCipher encryption is retained. CSV exports are not
a complete settings/restore archive.
