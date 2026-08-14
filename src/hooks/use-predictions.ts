import { useEffect, useState } from "react"
import { useCycles } from "./use-cycles"
import { useSettings } from "./use-settings"
import { useDayLogs } from "./use-day-logs"
import { computePrediction } from "@/services/predictions"
import type { PredictionResult } from "@/types/prediction"

export function usePrediction(): {
  prediction: PredictionResult | null
  periodLength: number
} {
  const { cycles } = useCycles()
  const { logs } = useDayLogs()
  const { avgCycleLength, avgPeriodLength, lutealPhaseLength } = useSettings()

  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [periodLength, setPeriodLength] = useState<number>(avgPeriodLength)

  useEffect(() => {
    let cancelled = false
    computePrediction().then((bundle) => {
      if (cancelled || !bundle) return
      setPrediction(bundle.prediction)
      setPeriodLength(bundle.periodLength)
    })
    return () => {
      cancelled = true
    }
  }, [cycles, logs, avgCycleLength, avgPeriodLength, lutealPhaseLength])

  return { prediction, periodLength }
}
