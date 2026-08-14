import { format } from "date-fns"
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
