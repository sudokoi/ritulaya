export interface PredictionResult {
  nextPeriodStart: Date
  nextPeriodEnd: Date
  ovulationDay: Date
  fertileWindow: {
    start: Date
    end: Date
  }
  uncertaintyWindow: {
    start: Date
    end: Date
  }
  confidence: number
  cyclesUsed: number
  engine: PredictionEngine
}

export type PredictionEngine = "wma"
