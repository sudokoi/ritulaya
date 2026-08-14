import { useMemo } from "react"
import { useCycles } from "./use-cycles"
import { useSettings } from "./use-settings"
import { useDayLogs } from "./use-day-logs"
import { averagePeriodLength } from "@/lib/cycle-derivation"
import { predict } from "@/predictions"
import type { PredictionResult } from "@/types/prediction"

export function usePrediction(): {
  prediction: PredictionResult
  periodLength: number
} {
  const { cycles } = useCycles()
  const { logs } = useDayLogs()
  const { avgCycleLength, avgPeriodLength, lutealPhaseLength } = useSettings()

  const periodLength = useMemo(
    () => averagePeriodLength(cycles, logs, avgPeriodLength),
    [cycles, logs, avgPeriodLength],
  )

  const prediction = useMemo(
    () =>
      predict(cycles, {
        avgCycleLength,
        avgPeriodLength: periodLength,
        lutealPhaseLength,
      }),
    [cycles, avgCycleLength, periodLength, lutealPhaseLength],
  )

  return { prediction, periodLength }
}
