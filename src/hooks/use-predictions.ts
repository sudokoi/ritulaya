import { useMemo } from "react"
import { useCycles } from "./use-cycles"
import { useSettings } from "./use-settings"
import { predict } from "@/predictions"

export function usePrediction() {
  const { cycles } = useCycles()
  const { avgCycleLength, avgPeriodLength, lutealPhaseLength } = useSettings()

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
