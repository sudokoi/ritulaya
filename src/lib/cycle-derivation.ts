import { differenceInDays, format } from "date-fns"
import type { Cycle } from "@/types/cycle"
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
      sum + differenceInDays(new Date(cycle.endDate ?? cycle.startDate), cycle.startDate),
    0,
  )
  return Math.round(total / completed.length)
}

export function deriveCycleDays(
  cycles: Cycle[],
  prediction: PredictionResult | null,
): {
  periodDays: string[]
  predictedDays: string[]
  fertileDays: string[]
  ovulationDays: string[]
} {
  const periodDays = cycles.flatMap((cycle) =>
    cycle.endDate ? expandDays(new Date(cycle.startDate), new Date(cycle.endDate)) : [],
  )

  if (!prediction) {
    return { periodDays, predictedDays: [], fertileDays: [], ovulationDays: [] }
  }

  return {
    periodDays,
    predictedDays: expandDays(prediction.nextPeriodStart, prediction.nextPeriodEnd),
    fertileDays: expandDays(prediction.fertileWindow.start, prediction.fertileWindow.end),
    ovulationDays: [format(prediction.ovulationDay, "yyyy-MM-dd")],
  }
}
