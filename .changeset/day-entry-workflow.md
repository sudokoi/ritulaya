---
"ritulaya": patch
---

Route day-entry saves, deletions, and flow clearing through one command layer that
awaits persistence and data refresh. Clearing flow sends only the changed field,
leaving other persisted values untouched. Today, Calendar, history, and widget
logging reuse the editor workflow rather than maintaining separate write paths.

Cycle placement, reconciliation, and stored history are unchanged.
