import { createStore } from "@xstate/store"
import { computePrediction } from "@/services/predictions"
import { cycleStore } from "@/stores/cycle-store"
import { dayLogStore } from "@/stores/day-log-store"
import { settingsStore } from "@/stores/settings-store"
import type { PredictionResult } from "@/types/prediction"
import type { Phase } from "@/constants/phase-colors"

export interface PredictionState {
  prediction: PredictionResult | null
  periodLength: number
  avgCycleLength: number
  phase: Phase
  loaded: boolean
}

export const predictionStore = createStore({
  context: {
    prediction: null,
    periodLength: 3,
    avgCycleLength: 28,
    phase: "follicular",
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
      },
    ) => ({
      prediction: event.prediction,
      periodLength: event.periodLength,
      avgCycleLength: event.avgCycleLength,
      phase: event.phase,
      loaded: true,
    }),
  },
})

let inFlight = false
let pending = false

export async function recomputePrediction(): Promise<void> {
  if (inFlight) {
    pending = true
    return
  }

  inFlight = true
  try {
    do {
      pending = false
      const { context: cycleCtx } = cycleStore.getSnapshot()
      const { context: logCtx } = dayLogStore.getSnapshot()
      const { context: settingsCtx } = settingsStore.getSnapshot()

      const bundle = await computePrediction(cycleCtx.cycles, logCtx.logs, {
        avgCycleLength: settingsCtx.avgCycleLength,
        avgPeriodLength: settingsCtx.avgPeriodLength,
        lutealPhaseLength: settingsCtx.lutealPhaseLength,
      })

      if (!bundle) return

      predictionStore.send({
        type: "setBundle",
        prediction: bundle.prediction,
        periodLength: bundle.periodLength,
        avgCycleLength: bundle.avgCycleLength,
        phase: bundle.phase,
      })
    } while (pending)
  } finally {
    inFlight = false
  }
}

let lastSettingsKey = ""

cycleStore.subscribe(() => void recomputePrediction())
dayLogStore.subscribe(() => void recomputePrediction())
settingsStore.subscribe((snapshot) => {
  const s = snapshot.context
  const key = `${s.avgCycleLength}:${s.avgPeriodLength}:${s.lutealPhaseLength}`
  if (key === lastSettingsKey) return
  lastSettingsKey = key
  void recomputePrediction()
})

void recomputePrediction()
