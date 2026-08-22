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
  /**
   * Max updated_at across the inputs, used natively to detect widget-snapshot
   * staleness against the live database.
   */
  dataVersion: string
}

/**
 * Localized widget copy, captured at compute time so the home-screen widget
 * renders exactly what translation.json holds without duplicating strings in
 * Kotlin. The days-until templates keep a %d placeholder for render-time
 * formatting; Kotlin picks singular vs plural by count.
 */
export interface WidgetCopyInput {
  menstrual: string
  follicular: string
  ovulation: string
  luteal: string
  today: string
  dayUntilSingular: string
  daysUntilMany: string
}

interface RitulayaPredictionsNativeModule {
  predict(
    cycles: CycleInput[],
    logs: DayLogInput[],
    config: PredictionConfigInput,
    copy: WidgetCopyInput,
  ): Promise<NativePredictionResult>
}

export default requireOptionalNativeModule<RitulayaPredictionsNativeModule>(
  "RitulayaPredictions",
)
