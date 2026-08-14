import RitulayaPredictions from "../../modules/ritulaya-predictions"
import { parseISO } from "date-fns"
import type { PredictionResult } from "@/types/prediction"

export interface PredictionBundle {
  prediction: PredictionResult
  periodLength: number
}

export async function computePrediction(): Promise<PredictionBundle | null> {
  if (!RitulayaPredictions) return null

  const result = await RitulayaPredictions.predict()
  if (!result) return null

  return {
    prediction: {
      nextPeriodStart: parseISO(result.prediction.nextPeriodStart),
      nextPeriodEnd: parseISO(result.prediction.nextPeriodEnd),
      ovulationDay: parseISO(result.prediction.ovulationDay),
      fertileWindow: {
        start: parseISO(result.prediction.fertileWindow.start),
        end: parseISO(result.prediction.fertileWindow.end),
      },
      confidence: result.prediction.confidence,
      cyclesUsed: result.prediction.cyclesUsed,
      engine: result.prediction.engine as PredictionResult["engine"],
    },
    periodLength: result.periodLength,
  }
}
