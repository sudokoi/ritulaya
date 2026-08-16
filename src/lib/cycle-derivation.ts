import { addDays, format } from "date-fns"
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

interface DeriveOptions {
  avgCycleLength?: number
  throughDate?: Date
}

export interface FertileDay {
  date: string
  fraction: number
}

export function fertileFractions(fertileDays: FertileDay[]): Map<string, number> {
  return new Map(fertileDays.map((day) => [day.date, day.fraction]))
}

export function deriveCycleDays(
  prediction: PredictionResult | null,
  flowDays: string[],
  options?: DeriveOptions,
): {
  periodDays: string[]
  predictedDays: string[]
  fertileDays: FertileDay[]
  ovulationDays: string[]
} {
  if (!prediction) {
    return {
      periodDays: flowDays,
      predictedDays: [],
      fertileDays: [],
      ovulationDays: [],
    }
  }

  const cycleLength = Math.max(1, options?.avgCycleLength ?? 28)
  const horizon = options?.throughDate ?? prediction.nextPeriodEnd

  const predictedDays: string[] = []
  const fertileDays: FertileDay[] = []
  const ovulationDays: string[] = []

  let periodStart = new Date(prediction.nextPeriodStart)
  let periodEnd = new Date(prediction.nextPeriodEnd)
  let ovulation = new Date(prediction.ovulationDay)
  let fertileStart = new Date(prediction.fertileWindow.start)
  let fertileEnd = new Date(prediction.fertileWindow.end)

  while (periodStart <= horizon) {
    const clippedEnd = periodEnd <= horizon ? periodEnd : horizon
    predictedDays.push(...expandDays(periodStart, clippedEnd))
    const window = expandDays(fertileStart, fertileEnd)
    window.forEach((date, i) => {
      const fraction = window.length > 1 ? 0.25 + 0.5 * (i / (window.length - 1)) : 0.5
      fertileDays.push({ date, fraction })
    })
    ovulationDays.push(format(ovulation, "yyyy-MM-dd"))
    periodStart = addDays(periodStart, cycleLength)
    periodEnd = addDays(periodEnd, cycleLength)
    ovulation = addDays(ovulation, cycleLength)
    fertileStart = addDays(fertileStart, cycleLength)
    fertileEnd = addDays(fertileEnd, cycleLength)
  }

  return {
    periodDays: flowDays,
    predictedDays,
    fertileDays,
    ovulationDays,
  }
}
