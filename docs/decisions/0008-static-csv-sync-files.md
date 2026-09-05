# 0008: Two static CSV files for GitHub sync format

Date: 2026-08-12

Status: Accepted

## Context

The app syncs data to a private GitHub repository. We need a file format that is human-readable, diff-friendly, and efficient.

The reference project (expense-buddy) uses per-day CSV files (`expenses-YYYY-MM-DD.csv`). This makes sense for expense tracking where each day generates 0-20+ independent records and dirty-day tracking allows uploading only changed files. For a period tracker:

- Data volume is tiny (~500 rows for 5 years of daily logging)
- Most days have 0-1 log entries
- Cycles span 7-45 days and are coherent events
- Per-day files would create 365 near-empty files per year

## Decision

Use two static CSV files: `ritulaya-cycles.csv` (one row per cycle) and `ritulaya-day-logs.csv` (one row per logged day), plus `ritulaya-settings.json` for preferences. A `ritulaya.json` manifest records schema version and metadata for a future companion app. All files live at the repository root.

The CSV is plaintext and human-readable. Fields that may contain commas, quotes, or newlines (symptoms JSON, notes) are quoted using standard CSV quoting (double-quote wrapping with `""` escaping); newlines in notes are flattened to spaces. No base64 or other opaque encoding is used — the repository is private, so values are stored in the clear.

```
<repository root>/
├── ritulaya.json           ← { schemaVersion: 1, app: "ritulaya", sharing: null }
├── ritulaya-cycles.csv     ← id, start_date, end_date, created_at, updated_at, deleted_at
├── ritulaya-settings.json  ← settings and updatedAt
└── ritulaya-day-logs.csv   ← id, date, cycle_id, flow_intensity, symptoms, mood, notes, ...
```

## Consequences

- **Positive:** Human-readable — a user can open the CSV in any spreadsheet app.
- **Positive:** Git-friendly — small diffs on commit, meaningful commit messages for cycle changes.
- **Positive:** No dirty-day tracking needed — just a simple boolean dirty flag. Changes are always the entire file.
- **Positive:** No SHA caching needed — download both files on every sync (they're tiny), compare hash, merge if changed.
- **Positive:** The manifest enables forward compatibility: a companion app can read `schemaVersion` and handle format migrations without breaking.
- **Positive:** ~30% less sync code than expense-buddy's per-file approach.
- **Negative:** Git history granularity is at the file level, not day level. You can't `git log` to see changes to a specific date.
- **Negative:** If the CSV grows very large (decades of data), downloading both files on every sync becomes wasteful. This is unlikely for a period tracker's data volume.
