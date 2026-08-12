import { useMemo } from "react"
import { useCycleActor } from "./use-cycle-actor"
import { useSettingsActor } from "./use-settings-actor"
import { predict } from "@/predictions"

export function usePrediction() {
  const { cycles } = useCycleActor()
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
