export interface PredictionResult {
  nextPeriodStart: Date
  nextPeriodEnd: Date
  ovulationDay: Date
  fertileWindow: {
    start: Date
    end: Date
  }
  confidence: number
  cyclesUsed: number
  engine: PredictionEngine
}

export type PredictionEngine = "wma" | "bayesian" | "ml-model"

export interface PredictionConfig {
  avgCycleLength: number
  avgPeriodLength: number
  lutealPhaseLength: number
}

export interface PredictionStrategy {
  predict(
    cycles: { startDate: string; endDate: string | null }[],
    config: PredictionConfig,
  ): PredictionResult
}
