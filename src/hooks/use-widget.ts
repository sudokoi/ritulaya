import { useEffect } from "react"
import { refreshWidget } from "@/services/widget"
import { useCycles } from "@/hooks/use-cycles"
import { usePrediction } from "@/hooks/use-predictions"
import { useSettings } from "@/hooks/use-settings"

export function useWidget() {
  const { currentCycle } = useCycles()
  const prediction = usePrediction().prediction
  const { avgCycleLength, discreetMode } = useSettings()

  useEffect(() => {
    void refreshWidget()
  }, [currentCycle, prediction, avgCycleLength, discreetMode])
}
