import { differenceInDays, parseISO } from "date-fns"
import type { Cycle } from "@/types/cycle"
import type { DayLog } from "@/types/day-log"
import type { Phase } from "@/constants/phase-colors"
import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"

export interface CycleLengthRow {
  startDate: string
  length: number
}

export function completedCycleLengths(cycles: Cycle[]): CycleLengthRow[] {
  return cycles
    .filter((cycle) => cycle.endDate != null)
    .map((cycle) => ({
      startDate: cycle.startDate,
      length:
        differenceInDays(parseISO(cycle.endDate as string), parseISO(cycle.startDate)) +
        1,
    }))
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
}

/**
 * Translation key + parameter framing the spread, mirroring how the engine
 * measures it (median absolute deviation scaled to a standard deviation).
 */
export function regularityCopy(sigma: number): {
  key: "insights.regular" | "insights.fairlyRegular" | "insights.quiteVaried"
  days: number
} {
  const days = Math.max(1, Math.round(sigma))
  if (days <= 4) return { key: "insights.regular", days }
  if (days <= 7) return { key: "insights.fairlyRegular", days }
  return { key: "insights.quiteVaried", days }
}

/**
 * Phase boundaries for historical grouping. This mirrors
 * PredictionEngine.phaseOfDayInCycle (Kotlin) — including the wrap-around
 * rule for logs past the typical cycle start — so insights label phases
 * exactly like the engine does. Change both together.
 */
export function phaseOfDayInCycle(
  day: number,
  config: { avgCycleLength: number; avgPeriodLength: number; lutealPhaseLength: number },
): Phase {
  const ovulationDay = config.avgCycleLength - config.lutealPhaseLength
  if (day <= config.avgPeriodLength) return "menstrual"
  if (day >= config.avgCycleLength - config.avgPeriodLength) return "menstrual"
  if (day < ovulationDay - 3) return "follicular"
  if (day <= ovulationDay + 1) return "ovulation"
  return "luteal"
}

export interface PhaseTally {
  symptoms: [SymptomKey, number][]
  moods: [MoodKey, number][]
}

function tally<K extends string>(
  previous: [K, number][],
  values: (K | null)[],
): [K, number][] {
  const counts = new Map<K, number>(previous)
  for (const value of values) {
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

/**
 * Groups logged symptoms and moods by the phase each log's date falls in.
 * Presentation-layer aggregation over stored history — no prediction math.
 */
export function phaseCorrelations(
  cycles: Cycle[],
  logs: DayLog[],
  config: { avgCycleLength: number; avgPeriodLength: number; lutealPhaseLength: number },
): Record<Phase, PhaseTally> {
  const empty: PhaseTally = { symptoms: [], moods: [] }
  const result: Record<Phase, PhaseTally> = {
    menstrual: { ...empty },
    follicular: { ...empty },
    ovulation: { ...empty },
    luteal: { ...empty },
  }
  if (cycles.length === 0) return result

  const sorted = [...cycles].sort((a, b) => (a.startDate < b.startDate ? -1 : 1))

  for (const log of logs) {
    const cycle = sorted.findLast(
      (c) => log.date >= c.startDate && (c.endDate == null || log.date <= c.endDate),
    )
    if (!cycle) continue

    const dayInCycle = differenceInDays(parseISO(log.date), parseISO(cycle.startDate)) + 1
    if (dayInCycle < 1) continue

    const phase = phaseOfDayInCycle(dayInCycle, config)
    result[phase].symptoms = tally(result[phase].symptoms, log.symptoms)
    result[phase].moods = tally(result[phase].moods, [log.mood])
  }

  return result
}
