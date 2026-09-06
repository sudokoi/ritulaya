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
- Add explicit Yes, No and Not recorded activity choices. Preserve existing No
  values during migration; new entries remain unrecorded. Replace implicit clear
  sentinels with named field intent and keep partial writes transactional.
- Reconcile cycle boundaries and entry associations after flow edits/deletions,
  including backdated merges and splits. Add a before/after historical repair
  preview requiring confirmation; changed data invalidates the inspected preview.
- Publish cycles, entries, settings and predictions as one coherent cache version.
  Capture inputs together in native storage, discard superseded refresh results,
  and retain the previous complete snapshot if loading or prediction fails.
- Hide Insights health summaries and History search/filter details in discreet
  mode, while deliberately opened entries remain editable. Localize Insights
  dates and make setup controls wrap at large text sizes with 48dp actions.
- Align exact Expo SDK 57 package pins with its recommended patch matrix and
  React Native 0.86.3; preserve NativeWind 4 and the existing native architecture.
  Enforce compatibility and Expo Doctor checks in CI without automatic upgrades.
- Exclude private and device-protected app storage explicitly from Android cloud
  backups and device transfers, in addition to disabling automatic backup.
- Fix the native logging bridge returning a coroutine job instead of completing
  its write; diagnostic failures no longer create unhandled JS errors.
- Export useful, allowlisted local diagnostic context and app/Android versions.
  Filter new log writes and historical exports; omit raw errors, stacks, health
  fields, repository details and credentials. Reports remain user-initiated.
- Remove cycle-day and countdown details from private widgets and replace failed
  widget updates with neutral content. Keep privacy blocks owned by the pending
  app operation rather than releasing them during unrelated background sync.
- Coordinate reminder registration and privacy/language changes natively. Reject
  stale requests and await cancellation of scheduled and delivered notifications
  before installing changed policy, even when JS is suspended or cancelled.
- Gate protected routes on successful initialization, reject missing prediction
  results and stale authentication successes after backgrounding, remove the
  unauthenticated lock bypass, prevent widget/prediction feedback, and request notification
  permission only when enabling reminders. Guard pending settings writes, separate
  cycle-length editing from seeding, and disable Android automatic backup.
- Protect Android screenshots, recordings and recent-app previews when biometric
  lock or discreet mode is enabled. Keep routes hidden until the native window
  policy is applied, and offer a fail-closed retry if it cannot be applied.
- Replace timestamp-based sync with local revisions, three-way merging, explicit
  conflict review, atomic Git publication, and restart-safe recovery. Migrate old
  repository data only after confirmation, into readable root-level
  `ritulaya-sync-*.json` files; remove legacy sync files in the same atomic commit,
  preserving unrelated files and Git history. Store versions in the manifest;
  keep biometric policy local. Retain deletion records, validate inputs, and retry
  transient failures. Export all tracking fields and correct accumulated counts.

**Upgrade:** requires a rebuilt Android app for the new native command, not a
JS-only update. The local database migrates existing records and adds sync state.
Upgrade all syncing devices: confirmed migration deletes the legacy sync files
from the branch, and older apps are unsupported afterward. Existing cycle history is not
automatically repaired. GitHub data remains human-readable plaintext by design;
on-device SQLCipher encryption is retained. CSV exports are not a complete
settings/restore archive.
