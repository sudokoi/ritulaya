---
"ritulaya": patch
---

fix: deepen today/calendar seams and polish interactions

- Correct Today card rendering to use locale labels for symptoms and moods (tender_breasts → Tender Breasts) via a shared display seam
- Make Today flow dots and week strip tappable and share a single CycleStrip/DayEditor seam; TodayCard and Calendar now open the same DayDetailSheet
- Add calendar Today affordance to jump back to the current month when navigated away
- Fix DayDetailSheet Save button vertical centering and extract a unified Button primitive
