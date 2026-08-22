import { native, nativeCall } from "@/lib/native"
import { parseISO } from "date-fns"
import i18n from "@/i18n"
import type { Cycle } from "@/types/cycle"
import type { DayLog } from "@/types/day-log"
import type { PredictionResult } from "@/types/prediction"
import type { Phase } from "@/constants/phase-colors"

export interface PredictionConfig {
  avgCycleLength: number
  avgPeriodLength: number
  lutealPhaseLength: number
  /**
   * Max updated_at across the inputs, used natively to detect widget-snapshot
   * staleness against the live database.
   */
  dataVersion: string
}

export interface CycleStats {
  lengths: number[]
  median: number
  sigma: number
}

export interface PredictionBundle {
  prediction: PredictionResult
  periodLength: number
  avgCycleLength: number
  phase: Phase
  stats: CycleStats | null
}

/**
 * Localized widget copy captured from locales/*.json at compute time so
 * translation.json stays the single source of home-screen widget strings.
 * The days-until templates keep a %d placeholder; the widget formats the
 * live counter at render time.
 */
function widgetCopy() {
  const t = i18n.t.bind(i18n)
  return {
    menstrual: t("phase.menstrual.name"),
    follicular: t("phase.follicular.name"),
    ovulation: t("phase.ovulation.name"),
    luteal: t("phase.luteal.name"),
    today: t("widget.today"),
    dayUntilSingular: t("widget.daysUntilOne"),
    daysUntilMany: t("widget.daysUntilMany").replace("{{count}}", "%d"),
  }
}

export async function computePrediction(
  cycles: Cycle[],
  logs: DayLog[],
  config: PredictionConfig,
): Promise<PredictionBundle | null> {
  return nativeCall(
    native.predictions,
    async (predictions) => {
      const result = await predictions.predict(
        cycles.map((cycle) => ({
          id: cycle.id,
          startDate: cycle.startDate,
          endDate: cycle.endDate,
        })),
        logs.map((log) => ({
          date: log.date,
          cycleId: log.cycleId,
          flowIntensity: log.flowIntensity,
        })),
        config,
        widgetCopy(),
      )
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
          uncertaintyWindow: {
            start: parseISO(result.prediction.uncertaintyWindow.start),
            end: parseISO(result.prediction.uncertaintyWindow.end),
          },
          confidence: result.prediction.confidence,
          cyclesUsed: result.prediction.cyclesUsed,
          engine: result.prediction.engine as PredictionResult["engine"],
        },
        periodLength: result.periodLength,
        avgCycleLength: result.avgCycleLength,
        phase: result.phase as Phase,
        stats: result.stats
          ? {
              lengths: result.stats.lengths,
              median: result.stats.median,
              sigma: result.stats.sigma,
            }
          : null,
      }
    },
    null,
  )
}
