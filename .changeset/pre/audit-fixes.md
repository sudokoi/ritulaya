---
"ritulaya": patch
---

Fix sync correctness, privacy, and UX issues found in a codebase audit

- GitHub sync now fails loudly on API errors instead of reporting success, keeps writes made mid-sync from being wiped, and serializes concurrent sync runs
- Sync conflicts resolve by recency instead of delete-always-wins; overdue periods no longer project a fertile window two weeks late
- The OAuth token never crosses the JS bridge and device flow survives transient network outages
- Exported CSVs are properly quoted and formula-injection safe, and temp export files are deleted after sharing
- Reminders use a private lock-screen channel; sexual activity can be unset; background failures are logged instead of dropped
- Accessibility roles/labels and 44px touch targets across interactive UI, keyboard handling in the day sheet and GitHub sync, repository-name validation, and calendar rendering performance improvements
