# Ritulaya UI refresh

Status: approved for native implementation. Preserve tab icons and text without
touch animation, and center editor button labels horizontally and vertically.
The HTML preview is retained unchanged as the reviewed design artifact.

## Design brief

**Recognizably Ritulaya, with clearer hierarchy and dependable controls.**

Keep the warm off-white background, teal actions, soft corners, phase colors,
existing mood emoji, and supportive language. Keep Today, Calendar, and Settings
navigation. Do not introduce decorative cycle rings, gamification, illustrations,
new fonts, or animation merely to make the app look different.

The design should help someone answer three questions:

1. What have I recorded?
2. What is an estimate, and how uncertain is it?
3. Where do I log or change an entry?

Daily logging remains useful without a current cycle. No current cycle means no
unanchored phase or countdown. A prediction is not an observation or medical
advice. Auto-filled days must not be relabeled as individually observed.

No changes to storage, native commands, predictions, accounts, analytics, or
sync. GitHub CSV/JSON remains human-readable plaintext by design; the on-device
database remains encrypted. Discreet behavior needs explicit design, not a
low-contrast or blur effect.

## Review the proposal

Open [ui-refresh-preview.html](./ui-refresh-preview.html) directly in a browser.
It is a self-contained, offline **design review artifact**, not a web version of
Ritulaya, a native screenshot, or production-ready components. No external fonts,
scripts, requests, storage, or app records are used. All health data is synthetic.

The controls switch light/dark themes, Today states, text size, and editor save
states. Form controls demonstrate selection only. Save does not persist anything.
Navigation labels and week dates are illustrative, not functioning app routes.
The editor is an independent existing-entry specimen, not the selected Today
fixture. Browser layout checks cannot establish Android keyboard or TalkBack
correctness.

### Today

- Use a compact title/date header and a legible cycle number with its label.
- Keep phase context next to the cycle day rather than several centered lines.
- Give the estimated period dates and uncertainty their own clearly labeled
  block; do not communicate precision with a cycle-completion progress bar.
- Make the entry summary and Log/Edit action the only prominent action surface.
  Replace the unlabeled row of five flow circles with the recorded flow label.
- Keep the week strip and history entry point, but remove the duplicate selected
  day summary. A day still opens its editor directly; the Today action always
  opens today's date. Confirm this simplification before implementation.
- Keep phase advice as a quiet supporting section, only when anchored to a cycle
  and prediction. Do not hide uncertainty to achieve a compact layout.
- Without a cycle, show useful guidance and a secondary setup action. No-cycle
  and no-entry are independent states, including notes-only entries.

### Entry editor

- Retain a sheet with a non-scrolling date/Save/Close header. Do not move Save to
  a keyboard-sensitive footer. Let the header wrap at large text sizes.
- Keep flow, mood, and symptoms first. Use consistent wrapping choice chips,
  rather than squeezing five flow labels into equal-width boxes.
- Move Notes before the less frequently accessed measurements. A proposed
  “More tracking” disclosure contains cervical mucus, BBT, and sexual activity.
  Expand it initially for saved mucus, temperature, or sexual activity “Yes”;
  expansion never clears fields. Legacy sexual-activity “No” cannot reliably be
  distinguished from never recorded, so it must not imply an explicit observation
  or force this group open for every existing entry. This grouping needs approval.
- Retain every catalogue option. The preview includes all existing mood,
  symptom, flow, and mucus choices, with current single/multiple selection rules.
- Put explicit Delete entry and Remove period actions away from Save, at the
  end of the form. Keep existing command semantics and route-specific action
  availability; do not add new confirmations or persistence rules in this slice.
- Show pending feedback and keep the draft after failure. The preview proposes
  an inline save error; changing the current alert is a separate interaction
  decision to validate during implementation.
- Do not imply sexual-activity unknown/clear semantics are fixed by new styling.
  The preview uses an existing explicit “No”; the schema/bridge limitation remains.

### Discreet mode proposal

The Today specimen replaces cycle, phase, prediction, entry details, and dated
health markers with neutral messaging while retaining logging and history access.
Opening the editor is an intentional reveal, not new authentication. This is a
proposed policy for this workflow, not current app behavior or a complete privacy
policy. Calendar, accessibility labels, widgets, notifications, and recent-app
previews require separate decisions. Do not claim app-wide coverage.

## Current inventory and intended ownership

| Source                                                   | Current responsibility / gap                                        | Intended direction                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/constants/palette.ts`                               | Light/dark semantic colors, manually mirrored elsewhere             | Preserve its consumer API while consolidating authored values          |
| `src/global.css`                                         | Manually copied NativeWind variables; no danger variable            | Derived semantic variables, including error and control boundaries     |
| `tailwind.config.js`                                     | Repeated accent/phase colors; card/button/pill radii                | Consume the same tokens, retain compatibility aliases during migration |
| `src/constants/phase-colors.ts`                          | Four light/dark phase colors and names                              | Keep domain meanings separate from action/status tokens                |
| `src/lib/day-colors.ts`                                  | Menstrual/fertile gradients and flow-fill mapping                   | Consolidate color values only; retain fill and prediction semantics    |
| `src/hooks/use-theme-colors.ts`                          | Exposes four colors for native props                                | One resolved theme for native props and navigation                     |
| `src/app/_layout.tsx`                                    | Default navigation themes, separate NativeWind theme selection      | Adapt navigation colors and status-bar content to the resolved theme   |
| `src/app/(tabs)/_layout.tsx`                             | Custom tab colors and press opacity                                 | Keep navigation structure; consume shared tokens                       |
| `src/components/ui/button.tsx`                           | Three variants; 36/44 minimum heights; no pending API               | Centralize action states and 48dp targets without fixed text height    |
| `src/components/day-detail-sheet.tsx`                    | Local labels, repeated choices, inputs, modal and workflow handling | Extract only reused controls; keep draft/command ownership intact      |
| `src/app/history.tsx`                                    | Local FilterChip and DateFilter                                     | Reuse choice/field primitives once demonstrated in the editor          |
| `src/components/today-card.tsx`                          | Today summary plus primary action                                   | Keep domain-specific, simplify recorded information                    |
| `src/components/{day-circle,cycle-strip,month-grid}.tsx` | Domain calendar visuals                                             | Preserve meaningful gradients; audit non-color cues and target sizes   |
| `src/__tests__/unit/theme-tokens.test.ts`                | Regex-based checks of hand-maintained copies                        | Verify authored token output/consumer mapping, not library rendering   |

There is one generic UI component today: Button. The other shared components
encode product behavior and should not all move into `ui/`.

## Token contract proposal

Keep one dependency-free authored token source that both the build configuration
and application can consume. Derive CSS variables rather than requiring edits in
three files. Choose the exact build adapter during the foundation implementation;
do not replace the styling stack or add a runtime theme service.

### Color

Preserve the current values initially:

| Semantic role              | Light                 | Dark                  |
| -------------------------- | --------------------- | --------------------- |
| Canvas                     | `#FAF8F5`             | `#141416`             |
| Surface                    | `#FFFFFF`             | `#1E1E21`             |
| Muted surface              | `#ECE7E1`             | `#2C2C30`             |
| Primary text               | `#2D2D2F`             | `#F2F1EE`             |
| Supporting text            | `#6F6B64`             | `#A9A8A4`             |
| Decorative divider         | `#E8E4DF`             | `#2F2F33`             |
| Primary action / on-action | `#0F766E` / `#FFFFFF` | `#5EEAD4` / `#0F2E2A` |
| Danger                     | `#DC2626`             | `#F87171`             |
| Menstrual                  | `#A15878`             | `#DFA9C0`             |
| Follicular                 | `#42725A`             | `#A2CCB4`             |
| Ovulation                  | `#8C6A24`             | `#E4C585`             |
| Luteal                     | `#67589C`             | `#BDA9E2`             |

Add a stronger **control border** separately from decorative dividers (preview
candidate: `#8E877F` / `#77777E`). Use action color for focus. Selected controls
have a check mark and native selected state, not color alone. Add status colors
only when a consuming component needs them; no speculative palette expansion.

### Typography and geometry

Starting values for review, not a claim that every current screen uses them:

| Role                 | Size / line height | Weight |
| -------------------- | ------------------ | ------ |
| Screen title         | 28 / 36            | 600    |
| Cycle number         | 52 / 60            | 600    |
| Prominent date       | 24 / 32            | 600    |
| Section title        | 18 / 26            | 600    |
| Body / input         | 16 / 24            | 400    |
| Button / field label | 16 / 24            | 500    |
| Supporting text      | 14 / 20            | 400    |

- Keep platform fonts and language fallback; no font downloads. Do not disable
  font scaling, force single-line translated labels, or use tight line heights.
- Spacing: 4, 8, 12, 16, 20, 24, 32. Default screen gutter 20; section gap 24.
- Shapes: card 20, button/input 14, pill fully rounded, sheet top 24.
- Minimum interactive target 48dp. Calendar rows may scroll horizontally at
  narrow widths rather than shrinking targets; text labels may wrap.
- Errors and supporting copy must meet 4.5:1 contrast on their actual surfaces;
  large text and essential control boundaries at least 3:1. Never dim prediction
  uncertainty with an additional opacity multiplier.
- Keep restrained press feedback; loading needs a readable label, not continuous
  decoration. Reduced motion must work. Do not assign disabled opacity globally
  until its actual component combinations have been reviewed.

## Small component set, introduced through real consumers

| Component    | Contract to own                                          | What stays with callers                       |
| ------------ | -------------------------------------------------------- | --------------------------------------------- |
| Text         | Named typography role, semantic tone, native text props  | Copy, translation, content meaning            |
| Button       | Variant, size, pending/disabled feedback, label, target  | Command execution and error ownership         |
| IconButton   | Required accessible label, target, semantic tone         | Existing Lucide icon and action               |
| Field        | Persistent label, helper/error text, input styling       | Value, parsing, validation and save semantics |
| ChoiceChip   | Label, selected/disabled states, optional existing emoji | Single/multi-selection rules and catalogue    |
| ScreenHeader | Safe-area layout, title and actions                      | Routing                                       |

Do not invent a generic form engine or make an all-purpose “Card” with many
boolean options. Promote settings rows and empty states when the second real
consumer appears. Domain summaries stay outside `src/components/ui/`.

## Delivery boundaries

1. **This review:** brief, inventory, light/dark Today/editor proposal. No app
   changes. Confirm hierarchy, the More tracking disclosure, and discreet policy.
2. **Foundation:** consolidate tokens without restyling screens; adapt navigation
   and system bars; retain old imports/classes until migrated. Validate build
   output, light/dark switching, and startup/lock surfaces.
3. **Pilot:** introduce the small component set through Today/editor. Preserve
   shared commands and existing failure/draft behavior. Fix and verify Notes/BBT
   keyboard clipping before calling the pilot complete.
4. **Expansion:** use approved patterns in Calendar, History, then Settings.

No dependency upgrades, schema/sync-format changes, folder migration, or new
product capabilities are required. Existing ADR-0002 and ADR-0011 remain the
starting point; accepted changes to their contracts should be documented when
implemented, not declared accepted by this proposal.

## Acceptance checks for the native pilot

- Today: no records, notes-only/no cycle, cycle without prediction, recorded entry,
  future cycle, uncertain prediction, and discreet state.
- Editor: existing/missing fields, all catalogue options, deselection, save,
  persistence/refresh failure, clear-flow and delete where currently available.
- Light and dark themes; system theme changes; no unreadable navigation or
  status-bar content on startup, lock, tabs, or editor surfaces.
- Small Android viewport and large system text; all six locales, especially
  longer translated labels. No cropped actions or forced font shrinking.
- Notes and BBT with the docked keyboard: cursor visibility, multiline typing,
  internal scroll, focus switching, dismissal, and accessible Save.
- TalkBack labels/order, selected states, touch targets, and no unintended health
  detail disclosure from discreet previews.
- App-level tests cover our token adapters and observable component/workflow
  behavior. Do not re-test external-library keyboard, list, or storage guarantees.

The existing Android 16 keyboard gap and Pixel/Android 17 crash investigation
remain open. This design preview is not evidence that either is resolved.

## Preview validation — 2026-09-05

- Inspected the browser-rendered light/dark layouts and expanded measurement
  fields. Exercised no-cycle, notes-only, discreet, saving, and failed-save
  fixtures; checked single/multiple choice selection and draft retention across
  fixture changes. These are preview checks, not native app tests.
- Checked 360px and 320px browser viewports with 150% specimen text: no page or
  panel horizontal overflow. The week strip intentionally scrolls at narrow
  widths and is keyboard-focusable. Visible specimen buttons have a minimum
  height of 48 CSS pixels; this does not verify Android touch targets.
- Browser axe-core checks reported zero violations and zero incomplete checks
  for default light/dark states, narrow dark/large-text error state, and expanded
  light measurement fields. This is not a TalkBack or manual accessibility sign-off.
- Repository formatting and `git diff --check` passed. Production source and
  dependencies are unchanged; JS/Kotlin app suites were not rerun for this
  documentation-only slice.
