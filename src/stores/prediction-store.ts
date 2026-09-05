import { createStore } from "@xstate/store"
import { computePrediction } from "@/services/predictions"
import { native, nativeCall } from "@/lib/native"
import { cycleStore } from "@/stores/cycle-store"
import { dayLogStore } from "@/stores/day-log-store"
import { settingsStore } from "@/stores/settings-store"
import { changeLanguage } from "@/i18n"
import { logger } from "@/services/logger"
import type { PredictionResult } from "@/types/prediction"
import type { Phase } from "@/constants/phase-colors"
import type { CycleStats } from "@/services/predictions"

export interface PredictionState {
  prediction: PredictionResult | null
  periodLength: number
  avgCycleLength: number
  phase: Phase
  stats: CycleStats | null
  loaded: boolean
}

export const predictionStore = createStore({
  context: {
    prediction: null,
    periodLength: 3,
    avgCycleLength: 28,
    phase: "follicular",
    stats: null,
    loaded: false,
  } as PredictionState,
  on: {
    setBundle: (
      _,
      event: {
        prediction: PredictionResult | null
        periodLength: number
        avgCycleLength: number
        phase: Phase
        stats: CycleStats | null
      },
    ) => ({
      prediction: event.prediction,
      periodLength: event.periodLength,
      avgCycleLength: event.avgCycleLength,
      phase: event.phase,
      stats: event.stats,
      loaded: true,
    }),
  },
})

let inFlight: Promise<void> | null = null
let pending = false

/**
 * The widget compares this against the database's own max updated_at, so it
 * is read natively from the same source rather than recomputed from store
 * rows — the two computations drifting apart would wrongly invalidate good
 * widget snapshots.
 */
function latestDataVersion(): Promise<string> {
  return nativeCall(native.db, (db) => db.latestDataChange(), null).then(
    (value) => value ?? "",
  )
}

export function recomputePrediction(): Promise<void> {
  if (
    !cycleStore.getSnapshot().context.loaded ||
    !dayLogStore.getSnapshot().context.loaded ||
    !settingsStore.getSnapshot().context.loaded
  )
    return Promise.resolve()
  if (inFlight) {
    pending = true
    return inFlight
  }

  inFlight = (async () => {
    try {
      do {
        pending = false
        const { context: cycleCtx } = cycleStore.getSnapshot()
        const { context: logCtx } = dayLogStore.getSnapshot()
        const { context: settingsCtx } = settingsStore.getSnapshot()
        await changeLanguage(settingsCtx.language)

        const bundle = await computePrediction(cycleCtx.cycles, logCtx.logs, {
          avgCycleLength: settingsCtx.avgCycleLength,
          avgPeriodLength: settingsCtx.avgPeriodLength,
          lutealPhaseLength: settingsCtx.lutealPhaseLength,
          dataVersion: await latestDataVersion(),
        })

        if (!bundle) continue
        if (pending) continue

        predictionStore.send({
          type: "setBundle",
          prediction: bundle.prediction,
          periodLength: bundle.periodLength,
          avgCycleLength: bundle.avgCycleLength,
          phase: bundle.phase,
          stats: bundle.stats,
        })
      } while (pending)
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

let lastSettingsKey = ""

function invalidatePrediction() {
  void recomputePrediction().catch((error) =>
    logger.warn("prediction", "Recompute failed", error),
  )
}

cycleStore.subscribe(invalidatePrediction)
dayLogStore.subscribe(invalidatePrediction)
settingsStore.subscribe((snapshot) => {
  const s = snapshot.context
  // Language participates: the widget snapshot captures localized display
  // strings at compute time, so switching languages must rewrite it.
  const key = `${s.avgCycleLength}:${s.avgPeriodLength}:${s.lutealPhaseLength}:${s.language}`
  if (key === lastSettingsKey) return
  lastSettingsKey = key
  invalidatePrediction()
})
