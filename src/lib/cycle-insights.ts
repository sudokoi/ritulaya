import { differenceInDays, parseISO } from "date-fns"
import type { Cycle } from "@/types/cycle"
import type { DayLog } from "@/types/day-log"
import type { Phase } from "@/constants/phase-colors"

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
 * Plain-language framing of spread, mirroring how the engine measures it
 * (median absolute deviation scaled to a standard deviation).
 */
export function regularityCopy(sigma: number): string {
  const days = Math.max(1, Math.round(sigma))
  if (days <= 4) return `Varies by about ±${days} days — regular`
  if (days <= 7) return `Varies by about ±${days} days — fairly regular`
  return `Varies by about ±${days} days — quite varied`
}

export interface PhaseTally {
  symptoms: [string, number][]
  moods: [string, number][]
}

function tally(values: (string | null)[]): [string, number][] {
  const counts = new Map<string, number>()
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
  const ovulationDay = config.avgCycleLength - config.lutealPhaseLength

  const phaseOfDayInCycle = (day: number): Phase => {
    if (day <= config.avgPeriodLength) return "menstrual"
    if (day < ovulationDay - 3) return "follicular"
    if (day <= ovulationDay + 1) return "ovulation"
    return "luteal"
  }

  for (const log of logs) {
    const cycle = sorted.findLast(
      (c) => log.date >= c.startDate && (c.endDate == null || log.date <= c.endDate),
    )
    if (!cycle) continue

    const dayInCycle = differenceInDays(parseISO(log.date), parseISO(cycle.startDate)) + 1
    if (dayInCycle < 1) continue

    const phase = phaseOfDayInCycle(dayInCycle)
    result[phase].symptoms = tally([
      ...result[phase].symptoms.map(([k]) => k),
      ...log.symptoms,
    ])
    result[phase].moods = tally([...result[phase].moods.map(([k]) => k), log.mood])
  }

  return result
}
