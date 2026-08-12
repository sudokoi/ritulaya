import type {
  PredictionStrategy,
  PredictionResult,
  PredictionConfig,
} from "@/types/prediction"
import { createWMAPredictor } from "./weighted-moving-average"

let currentStrategy: PredictionStrategy | null = null

export function getPredictionStrategy(): PredictionStrategy {
  if (!currentStrategy) {
    currentStrategy = createWMAPredictor()
  }
  return currentStrategy
}

export function setPredictionStrategy(strategy: PredictionStrategy): void {
  currentStrategy = strategy
}

export function predict(
  cycles: { startDate: string; endDate: string | null }[],
  config: PredictionConfig,
): PredictionResult {
  return getPredictionStrategy().predict(cycles, config)
}
