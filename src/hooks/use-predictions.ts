import { useMemo } from "react"
import { useCycles } from "./use-cycles"
import { useSettingsActor } from "./use-settings-actor"
import { predict } from "@/predictions"

export function usePrediction() {
  const { cycles } = useCycles()
  const { avgCycleLength, avgPeriodLength, lutealPhaseLength } = useSettingsActor()

  return useMemo(
    () =>
      predict(cycles, {
        avgCycleLength,
        avgPeriodLength,
        lutealPhaseLength,
      }),
    [cycles, avgCycleLength, avgPeriodLength, lutealPhaseLength],
  )
}
