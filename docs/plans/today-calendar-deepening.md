# Plan: Today / Calendar Deepening — fix raw keys, interactivity, Today affordance, and button locality

> Branch: `fix/today-calendar-deepening` — no patch fixes, all changes go through deep modules.

## 0. Problem restated (from user)

1. **Raw-key rendering:** `TODAY` card `src/app/(tabs)/index.tsx:174-189` renders `symptom` (`tender_breasts`) and `mood` verbatim. Sheet `src/components/day-detail-sheet.tsx:254` correctly does `t(`symptoms.${key}`)`.
2. **No jump-to-today:** `CalendarScreen` `src/app/(tabs)/calendar.tsx:16-17` has `viewedMonth` with only chevron navigation; no `Today` pill like Google Calendar.
3. **Non-touchable strips:** `TODAY` 5 flow dots are `View` (`index.tsx:162-171`), `THIS WEEK` `WeekStrip` `src/components/week-strip.tsx:30-45` is static `View`. User expects tappable days and tappable flow levels. Question asked: *do we need two strips?*
4. **Save vertical centering:** `DayDetailSheet` Save `Pressable` `src/components/day-detail-sheet.tsx:132-139` `px-5 py-2` without `items-center justify-center`, text baseline drifts on Android vs neighboring `p-3` icon buttons.

All four share root cause: **shallow, duplicated presentation logic at feature screens instead of deep modules behind small interfaces.**

## 1. Domain model (CONTEXT.md)

No new top-level terms required; sharpen existing:

- **Day entry** — already defined as "everything on a calendar date." Clarify that its *display name* (Symptom/Mood/Mucus label) is derived, not stored. Store `SymptomKey`, display `symptoms.<key>` via locale.
- **Cycle day state** — derived visual state of a date (`period/predicted/uncertain/fertile/ovulation/logged`) `src/hooks/use-cycle-day-states.ts:15-22`. Distinct from persisted `DayLog`. Week strip and month grid share this module; Today card should not re-derive it but should delegate interaction via it.
- **Day strip** — (propose to add) a consecutive run of dates rendered with `CycleDayState` and an `isToday` marker. Both `WeekStrip` and month grid are specialisations; Today needs `span=7 centered on today`.

Update `CONTEXT.md` with **Day strip** term on implementation.

## 2. Current architecture friction (deletion test)

| Module | Shape | Why shallow / leaking | Deletion test |
|---|---|---|---|
| `TodayScreen` `index.tsx:21-216` | God screen: hero + TODAY detail + WeekStrip + LogPeriod button inline | Owns date math (`addDays` L49), translation, and non-interactive Views. If deleted, its logic scatters into 3 places but no complexity is hidden — pass-through. | Delete it → logic reappears in each caller, no concentration → not deep. |
| `WeekStrip` `week-strip.tsx:11-50` | `days: {date,label,isToday,state}[]` in, JSX out | Requires caller to precompute `weekDays` (L49-66). Provides no `onDayPress` seam, so callers cannot make it interactive without forking. One adapter (Today) → hypothetical seam. | Delete → caller still builds array, nothing saved. |
| `TODAY` inline `index.tsx:153-197` | `todayLog` → 5 `View` dots + pills | Same symptom/mood translation duplicated from sheet; flow dots non-pressable duplication of `FLOW_LEVELS` in sheet `L18-24`. | Delete → bug (raw keys) fixes itself only if reimplemented elsewhere — no locality. |
| `MonthGrid` + `DayDetailSheet` | `MonthGrid` owns chevrons, `CalendarScreen` owns sheet state `L15-26` and handlers `L28-63` | `TodayScreen` cannot reuse sheet → second copy would duplicate `handleSave/handleDelete/handleClearPeriod` + `refreshAll`. | Delete sheet → every screen reimplements save-failure `Alert` + `Haptics`. |
| Save button `day-detail-sheet.tsx:132-139` | Ad-hoc `Pressable rounded-button bg-accent px-5 py-2` | No `Button` module — `seed.tsx:37`, `github-sync.tsx:153`, `biometric-gate.tsx:95` each re-string classes. `py-2` vs `py-4` drift causes vertical centering bug. | Delete → inconsistency vanishes only because classes were duplicated. |

**Leverage opportunity:** centralising symptom/mood display, strip interaction, sheet orchestration, and button chrome gives N call sites × M locales payoff.

## 3. Target architecture — deep modules

### Module 1: `domain/day-entry-display` (new) — deep presentation

- **Interface:** `symptomLabel(key: SymptomKey, t): string`, `moodLabel(key, t)`, `mucusLabel(key,t)`, `flowLabel(key,t)`, `symptomLabels(keys, t): string[]`. Optionally `translateOrKey` fallback.
- **Implementation:** wraps `SYMPTOM_CATALOG` `src/constants/symptoms.ts`, `MOOD_CATALOG`, `CERVICAL_MUCUS_CATALOG`, and `t('symptoms.*')` lookup. Pure, no RN deps.
- **Depth:** callers pass a key, get back locale-aware string; no catalog import needed at call sites. Locality for the `tender_breasts → Tender Breasts` fix is one file. Tested through interface with fake `t`.
- **Seam:** lives at `src/domain/` (domain, not component). Used by `TodayCard`, `Insights`, widget, export.

### Module 2: `components/cycle-strip` (replaces `WeekStrip`) — deep strip

- **Interface:** `props: { centerDate: Date, span?: number (default 7), dayStates: Map<string,CycleDayState>, onDayPress?: (date:Date)=>void, today?: Date }`. Internally computes labels (`EEEEE`), `isToday`, derives `CycleDayState` if not supplied? Prefer caller passes `dayStates` (keep derivation in `useCycleDayStates`), strip only maps `date→state`.
- **Implementation:** `Pressable` per cell (with `android_ripple` null, `active:opacity-60`), reuses `DayCircle` + `resolveDayStyle` `src/lib/day-colors.ts:28-46`. Handles `marked/empty` variants, `today` underline. No leaked `weekDays` array building — strip owns `addDays` loop.
- **Depth:** caller learns one component vs previous `build weekDays + pass array + no press`. Leverage across Today (span 7) and future compact calendar week view.
- **Seam:** external seam at `components/cycle-strip`. Internal seam: `resolveDayStyle` stays pure and testable.

Variant decision: keep `MonthGrid` as grid module; `CycleStrip` is strip module. Both consume same `CycleDayState` type (`hooks/use-cycle-day-states.ts:15`). Don't merge grid+strip — different layouts.

### Module 3: `components/today-card` (extract from `index.tsx:153-197`) — deep detail card

- **Interface:** `props: { log: DayLog|null, onFlowSelect?: (level:FlowIntensity)=>void, onOpenEditor?: (date:Date)=>void, t }`. Renders header `TODAY`, flow row, symptom pills, mood chip, empty state.
- **Implementation:** uses `domain/day-entry-display` for labels, `FLOW_LEVELS` single source (shared const), `Pressable` dots (`onFlowSelect` → `upsertDayLog` or `logPeriodOn`). Symptom pills use `rounded-pill bg-muted`. Empty → `t('today.nothingLogged')`.
- **Depth:** hides 5-dot loop, catalog lookup, and empty-state branching. Locality for any future display tweak (e.g., showing mucus/bbt inline).
- **Seam:** at `components/today-card`. Internal adapter: `Button` for Edit link.

### Module 4: `hooks/use-day-editor` + deep `DayDetailSheet` seam

- **Interface:** `useDayEditor(): { selectedDate: Date|null, existingLog: DayLog|null, open(date:Date), close(), handleSave, handleDelete, handleClearPeriod, visible }`. Sheet props: `{ visible, date, existing, onSave, onDelete, onClearPeriod, onClose }` unchanged but now driven by hook.
- **Implementation:** hook wraps `useDayLogs().getLogForDate`, `saveDayEntry` `src/domain/day-entry.ts:38-66`, `refreshAll`, `Alert` + `Haptics` (already in sheet but move orchestration out). Both `CalendarScreen` and `TodayScreen` import same hook — second adapter makes seam real.
- **Depth:** callers learn `open(date)` instead of reimplementing `format(date,'yyyy-MM-dd')` + `Alert` error branches. Locality for save-failure strings and haptics.
- **Note:** sheet's internal `useState(existing?.*)` has stale-prop bug (state not reset when `existing` changes); deepening is the moment to switch to `useEffect` sync or `key={date}` remount (calendar already uses `key={selectedDate}` `L95`). Fix there.

### Module 5: `components/ui/button` — deep button primitive

- **Interface:** `<Button variant="primary|ghost|muted" size="sm|md" className? onPress? accessibilityLabel?>` — renders `Pressable` with `items-center justify-center` and `Text` with `text-center leading-none textAlignVertical="center" includeFontPadding={false}`. Single source for `rounded-button bg-accent` etc. `src/components/day-detail-sheet.tsx:132-139` becomes `<Button variant="primary" size="sm">{t('common.save')}</Button>`.
- **Depth:** callers stop assembling `px-5 py-2 active:opacity-60` strings. Vertical centering fixed once. Leverage across `seed.tsx`, `github-sync.tsx`, `biometric-gate.tsx`.
- **Seam:** at `components/ui/button`. Internal: NativeWind `cn` merging.

### Module 6: Calendar header affordance

- **Interface:** `MonthGrid` gains optional `onToday?: ()=>void` and `isTodayVisible: boolean`. Or `CalendarScreen` renders `Today` pill above grid when `!isSameMonth(viewedMonth, today)`. Prefers prop on `MonthGrid` to keep chrome locality.
- **Implementation:** `isTodayVisible = !isSameMonth(viewedMonth, new Date())`; `onToday = ()=> setViewedMonth(startOfMonth(new Date()))`. Button reuses `Button` primitive `variant="muted" size="sm"`.

### Cross-cutting: locale keys

Add `calendar.today: "Today"` `en-US` (+ `discreet` variant if needed) — follow existing `prevMonth/nextMonth` pattern `L61-62`.

## 4. What we will NOT do

- Do not merge `TodayCard` + `CycleStrip` into one component — they serve derived-state vs persisted-entry concerns (per CONTEXT: Cycle day state vs Day entry). Keep seam.
- Do not make `CycleStrip` derive `CycleDayState` itself — derivation stays in `useCycleDayStates` (already deep, shared). Strip only consumes map.
- Do not introduce generic `DataRow` abstraction — one seam too broad masks domain language.

## 5. Plan of work (sequenced for locality)

1. **S1 — `day-entry-display` module + CONTEXT update** (no UI churn, unblocks 3). Add unit test `src/__tests__/unit/day-entry-display.test.ts` for key→label mapping.
2. **S2 — `ui/button` primitive** — extract from existing `Pressable` usages, fix Save centering in sheet (`items-center justify-center` + `leading-none` + `includeFontPadding:false`). Visual diff only.
3. **S3 — `cycle-strip` deepening** — replace `week-strip.tsx` (keep re-export for compat during migration), make cells `Pressable`. Add `onDayPress` wiring.
4. **S4 — `use-day-editor` hook** — extract from `calendar.tsx:13-64`, fix stale `existing` → `useEffect` sync, reuse in `TodayScreen`.
5. **S5 — `today-card` extraction** — move `index.tsx:153-197` into component, use `day-entry-display` + `Pressable` flow dots wired to `use-day-editor` or direct `upsertDayLog`.
6. **S6 — Calendar `Today` pill** — `MonthGrid` header change, `calendar.today` locale.
7. **S7 — Integrate in `TodayScreen`** — wire `CycleStrip onDayPress -> openEditor`, `TodayCard onFlowSelect/onOpenEditor`, mount single `DayDetailSheet`. Remove dead `weekDays` memo.
8. **S8 — Parity / a11y / regression** — run `translation-parity`, `cycle-derivation`, `theme-tokens` tests; manual check Save vertical centering on Android, Today jump, symptom label, flow dot hit target.

## 6. Testing strategy (interface is test surface)

- `day-entry-display`: table test `key→t()` → label, fallback to key if missing.
- `cycle-strip`: render with mocked `dayStates`, assert `onDayPress` fires with correct `Date`, `isToday` underline present, `resolveDayStyle` mapping (period/predicted/fertile).
- `today-card`: render `log=null` → "Nothing logged", `log={flow:medium, symptoms:['tender_breasts'], mood:'anxious'}` → "Tender Breasts"/"Anxious" via `t`. Flow dot press → `onFlowSelect('medium')`.
- `use-day-editor`: hook test with fake `dayLogStore`, assert `open` sets `selectedDate`, `handleSave` calls `saveDayEntry` + `refreshAll`, failure shows `Alert` (mock).
- `ui/button`: snapshot of `primary sm` includes `items-center justify-center` + `text-center leading-none`.
- No screenshot tests required; keep existing `dayLogPatch` contract intact.

## 7. Open questions / constraints

- `today` memo `index.tsx:29` frozen at mount — with strip interaction, recompute on focus (`useFocusEffect` + `todayISO()` ) or pass `new Date()` fresh each render. Choose focus recompute to avoid stale `isToday`.
- `periodLength` source — `usePrediction().periodLength` vs `useSettings().avgPeriodLength`; keep prediction variant for `logPeriod` fillCount semantics `RitulayaDataStore.kt:86-96`.
- ADR? `Button` primitive qualifies as ADR-worthy (hard to reverse, surprising choice of seam). Record after S2 if accepted.

## 8. Verification

- `yarn test src/__tests__/unit` green, `yarn lint`/`tsc` clean.
- Simulator: log `tender_breasts` via calendar, verify Today shows "Tender Breasts"; tap flow dot toggles; tap WeekStrip day opens sheet; navigate calendar 2 months away, `Today` pill appears, tap returns; Save button text centered (measure via layout inspector / screenshot).
