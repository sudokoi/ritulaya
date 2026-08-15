import { useSelector } from "@xstate/store-react"
import { predictionStore } from "@/stores/prediction-store"
import type { PredictionResult } from "@/types/prediction"
import type { Phase } from "@/constants/phase-colors"

export function usePrediction(): {
  prediction: PredictionResult | null
  periodLength: number
  avgCycleLength: number
  phase: Phase
} {
  const prediction = useSelector(predictionStore, (s) => s.context.prediction)
  const periodLength = useSelector(predictionStore, (s) => s.context.periodLength)
  const avgCycleLength = useSelector(predictionStore, (s) => s.context.avgCycleLength)
  const phase = useSelector(predictionStore, (s) => s.context.phase)

  return { prediction, periodLength, avgCycleLength, phase }
}
