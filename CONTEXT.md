# Context

Glossary for Ritulaya — a privacy-first period tracker. Terms are domain
language only; implementation lives in code and ADRs (`docs/decisions/`).

## Terms

**Cycle** — one menstrual cycle: a start date (first day of flow) and an end
date (the day before the next cycle's start, or open while ongoing).

**Flow** — the intensity of bleeding logged on a day: none, spotting, light,
medium, or heavy. A day with flow other than none is a _flow day_.

**Day entry** — everything a user records about a single calendar date: flow,
symptoms, mood, notes, cervical mucus, basal body temperature (BBT), and
sexual activity. One entry per date.

**Period** — a run of consecutive flow days belonging to one Cycle. Logging
flow on a day may start a new Period and can extend or create Cycles;
placement of a date into a Cycle is the system's job, not the user's.

**Seed cycle** — planting a historical period (a past start date plus typical
lengths) so predictions work before real logging history exists. Used at
first-run onboarding and when backfilling.

**Phase** — which part of the current Cycle today falls in: menstrual,
follicular, ovulation, or luteal. Boundaries derive from the user's configured
cycle, period, and luteal lengths.

**Prediction** — the engine's forward-looking output for the next period:
start, end, ovulation day, fertile window, and an uncertainty window.

**Uncertainty window** — the range around a predicted period start within
which it could plausibly begin (~80%). Widens with irregular history.

**Confidence** — how much the prediction should be trusted, combining how much
history exists with how regular that history is.

**Regularity** — how consistent the user's own recent cycle lengths are,
measured against their own pattern (never population averages).

**Discreet mode** — a privacy setting that relabels cycle-related language
with neutral wording across the app, notifications, and widget.

**Tombstone** — a durable record of an entry's deletion and when it occurred,
used to distinguish a deleted entry from one that has never been recorded.

**Day strip** — a consecutive run of calendar dates rendered with their
Cycle-day state and a today marker (e.g. the 7-day strip on the Today screen).
The strip owns date maths and interaction; derivation of Cycle-day state lives
elsewhere.

**Display label** — the locale-aware human string for a stored key (symptom,
mood, mucus, flow). Keys are persisted; labels are derived at presentation
time via the translation catalogue.
