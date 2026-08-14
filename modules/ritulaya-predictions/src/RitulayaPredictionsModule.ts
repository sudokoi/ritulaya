import { requireOptionalNativeModule } from "expo"

export interface NativePrediction {
  nextPeriodStart: string
  nextPeriodEnd: string
  ovulationDay: string
  fertileWindow: { start: string; end: string }
  confidence: number
  cyclesUsed: number
  engine: string
}

export interface NativePredictionResult {
  prediction: NativePrediction
  periodLength: number
}

interface RitulayaPredictionsNativeModule {
  predict(): Promise<NativePredictionResult>
}

export default requireOptionalNativeModule<RitulayaPredictionsNativeModule>("RitulayaPredictions")
