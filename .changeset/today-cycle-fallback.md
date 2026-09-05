---
"ritulaya": patch
---

Replace Today's large dash with a clear no-current-cycle message and guidance to
record a period start. Daily logging remains available without cycle history.
Show the real cycle-day number with a label when a current cycle is available,
using local calendar dates rather than elapsed time from a UTC-parsed date.

Hide the phase, progress, countdown, and phase advice when there is no current
cycle to anchor them. A missing prediction no longer produces a hardcoded
14-day countdown, and future period starts are not displayed as day one today.
