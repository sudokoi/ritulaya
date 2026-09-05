# ADR 0011: Unified Button Primitive

- Date: 2026-08-24
- Status: Accepted

## Context

Save and primary actions were built as ad-hoc `Pressable` + `Text` with duplicated NativeWind classes (`rounded-button bg-accent px-5 py-2` etc). Variants drifted (`py-2` vs `py-4`, missing `items-center justify-center`) causing vertical centering bugs on Android (`DayDetailSheet` Save). `seed.tsx`, `github-sync.tsx`, `biometric-gate.tsx`, and `month-grid.tsx` each reassembled the same pattern.

We need one seam for button chrome so vertical centering, hitSlop, and `active:opacity` are fixed once and leveraged across N call sites.

## Decision

Introduce `src/components/ui/button.tsx` as a deep module:

- Interface: `<Button variant="primary|muted|ghost" size="sm|md" onPress? disabled? accessibilityLabel? children: ReactNode>`
- Implementation hides `Pressable` layout (`flex-row items-center justify-center rounded-button`) and `Text` centering (`text-center leading-none textAlignVertical: center`).
- Single place for `min-h` and padding per size; callers stop assembling `px-*/py-*` strings.

## Consequences

- Positive: Save button centering fixed via CSS alone, no per-screen patches. Future variant changes (e.g., loading state) localize.
- Negative: Small indirection for callers; must learn `variant/size` vocabulary instead of raw classes.

## Alternatives considered

- Patch `day-detail-sheet.tsx:132` with `items-center justify-center` inline — shallow, drift recurs.
- Forward `className` passthrough without primitive — still leaks styling responsibility.

## Implementation follow-up — 2026-09-05

The approved Today/editor refresh keeps this ownership boundary. The Button now
adds `secondary` and `danger` variants plus optional `pending`/`pendingLabel`.
Both sizes have a 48dp minimum target; size controls padding rather than shrinking
the target. Labels use the authored 16/24 text role, centered native text with
`includeFontPadding: false`, and wrapping instead of `leading-none`. Pending
actions disable submission and expose their busy state to accessibility.

Selection-specific visuals belong to `ChoiceChip`, not boolean Button flags.
Equal checkmark/spacer slots center the label itself in both selected and
unselected states. Native screenshots confirmed alignment at normal and 150%
system text on the Android 16 QA emulator; this is not all-device sign-off.

## Related

- Plan: `docs/plans/today-calendar-deepening.md` S2
- Components: `DayDetailSheet`, `MonthGrid` Today pill
- Pilot: `docs/design/ui-refresh.md`
