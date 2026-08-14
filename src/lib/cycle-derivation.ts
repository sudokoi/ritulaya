import { differenceInDays, format } from "date-fns"
import type { Cycle } from "@/types/cycle"
import type { DayLog } from "@/types/day-log"
import type { PredictionResult } from "@/types/prediction"

function expandDays(start: Date, end: Date): string[] {
  const days: string[] = []
  const current = new Date(start)
  while (current <= end) {
    days.push(format(current, "yyyy-MM-dd"))
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function averageCycleLength(cycles: Cycle[], fallback: number): number {
  const completed = cycles.filter((cycle) => cycle.endDate !== null)
  if (completed.length === 0) return fallback

  const total = completed.reduce(
    (sum, cycle) =>
      sum +
      differenceInDays(new Date(cycle.endDate ?? cycle.startDate), cycle.startDate) +
      1,
    0,
  )
  return Math.round(total / completed.length)
}

export function averagePeriodLength(
  cycles: Cycle[],
  logs: DayLog[],
  fallback: number,
): number {
  const lengths: number[] = []
  for (const cycle of cycles) {
    if (cycle.endDate === null) continue
    const flowDates = logs
      .filter(
        (log) =>
          log.cycleId === cycle.id && log.flowIntensity && log.flowIntensity !== "none",
      )
      .map((log) => log.date)
      .sort()
    if (flowDates.length === 0) continue
    lengths.push(
      differenceInDays(
        new Date(flowDates[flowDates.length - 1]),
        new Date(flowDates[0]),
      ) + 1,
    )
  }

  if (lengths.length === 0) return fallback

  const total = lengths.reduce((sum, length, i) => sum + length / (i + 1), 0)
  const weight = lengths.reduce((sum, _, i) => sum + 1 / (i + 1), 0)
  return Math.round(total / weight)
}

export function deriveCycleDays(
  prediction: PredictionResult | null,
  flowDays: string[],
): {
  periodDays: string[]
  predictedDays: string[]
  fertileDays: string[]
  ovulationDays: string[]
} {
  if (!prediction) {
    return { periodDays: flowDays, predictedDays: [], fertileDays: [], ovulationDays: [] }
  }

  return {
    periodDays: flowDays,
    predictedDays: expandDays(prediction.nextPeriodStart, prediction.nextPeriodEnd),
    fertileDays: expandDays(prediction.fertileWindow.start, prediction.fertileWindow.end),
    ovulationDays: [format(prediction.ovulationDay, "yyyy-MM-dd")],
  }
}
