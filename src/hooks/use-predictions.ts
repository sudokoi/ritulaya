import { useSelector } from "@xstate/store-react"
import { dataStore } from "@/stores/data-store"
import type { PredictionResult } from "@/types/prediction"
import type { Phase } from "@/constants/phase-colors"
import type { CycleStats } from "@/services/predictions"

export function usePrediction(): {
  prediction: PredictionResult | null
  periodLength: number
  avgCycleLength: number
  phase: Phase
  stats: CycleStats | null
} {
  return useSelector(dataStore, (s) => s.context.prediction)
}
