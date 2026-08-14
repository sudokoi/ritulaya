import type {
  PredictionStrategy,
  PredictionResult,
  PredictionConfig,
} from "@/types/prediction"
import { createWMAPredictor } from "./weighted-moving-average"

const defaultStrategy: PredictionStrategy = createWMAPredictor()

export function predict(
  cycles: { startDate: string; endDate: string | null }[],
  config: PredictionConfig,
  strategy: PredictionStrategy = defaultStrategy,
): PredictionResult {
  return strategy.predict(cycles, config)
}
