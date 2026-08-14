import { useEffect, useState } from "react"
import { useCycles } from "./use-cycles"
import { useSettings } from "./use-settings"
import { useDayLogs } from "./use-day-logs"
import { computePrediction } from "@/services/predictions"
import type { PredictionResult } from "@/types/prediction"
import type { Phase } from "@/constants/phase-colors"

export function usePrediction(): {
  prediction: PredictionResult | null
  periodLength: number
  avgCycleLength: number
  phase: Phase
} {
  const { cycles } = useCycles()
  const { logs } = useDayLogs()
  const { avgCycleLength: avgCycleSetting, avgPeriodLength, lutealPhaseLength } = useSettings()

  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [periodLength, setPeriodLength] = useState<number>(avgPeriodLength)
  const [avgCycleLength, setAvgCycleLength] = useState<number>(avgCycleSetting)
  const [phase, setPhase] = useState<Phase>("follicular")

  useEffect(() => {
    let cancelled = false
    computePrediction(cycles, logs, {
      avgCycleLength: avgCycleSetting,
      avgPeriodLength,
      lutealPhaseLength,
    }).then((bundle) => {
      if (cancelled || !bundle) return
      setPrediction(bundle.prediction)
      setPeriodLength(bundle.periodLength)
      setAvgCycleLength(bundle.avgCycleLength)
      setPhase(bundle.phase)
    })
    return () => {
      cancelled = true
    }
  }, [cycles, logs, avgCycleSetting, avgPeriodLength, lutealPhaseLength])

  return { prediction, periodLength, avgCycleLength, phase }
}
