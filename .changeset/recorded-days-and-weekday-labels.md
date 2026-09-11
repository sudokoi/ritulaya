---
"ritulaya": patch
---

Make future dates read-only in Today, Calendar and History, with local-date guards
in the shared entry commands and native persistence. Refresh date availability at
midnight and when returning to the app.

Save daily flow only on the selected date rather than filling the typical period
length. Keep initial cycle seeding limited to elapsed dates through today. Preserve
existing entries and continue reconciling cycle boundaries after edits.

Use localized abbreviated weekday headings and clarify date-editing guidance in
all six locales. Make Calendar's return-to-Today action visually lighter with
supporting-size accent text and no filled background, with a 40dp minimum tap height.
The native persistence and seeding changes require a rebuilt
Android app.
