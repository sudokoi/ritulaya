import { requireOptionalNativeModule } from "expo"

export interface NativePrediction {
  nextPeriodStart: string
  nextPeriodEnd: string
  ovulationDay: string
  fertileWindow: { start: string; end: string }
  uncertaintyWindow: { start: string; end: string }
  confidence: number
  cyclesUsed: number
  engine: string
}

export interface NativeCycleStats {
  lengths: number[]
  median: number
  sigma: number
}

export interface NativePredictionResult {
  prediction: NativePrediction
  periodLength: number
  avgCycleLength: number
  phase: string
  stats: NativeCycleStats | null
}

export interface CycleInput {
  id: string
  startDate: string
  endDate: string | null
}

export interface DayLogInput {
  date: string
  cycleId: string | null
  flowIntensity: string | null
}

export interface PredictionConfigInput {
  avgCycleLength: number
  avgPeriodLength: number
  lutealPhaseLength: number
}

interface RitulayaPredictionsNativeModule {
  predict(
    cycles: CycleInput[],
    logs: DayLogInput[],
    config: PredictionConfigInput,
  ): Promise<NativePredictionResult>
}

export default requireOptionalNativeModule<RitulayaPredictionsNativeModule>(
  "RitulayaPredictions",
)
