import { useEffect } from "react"
import { refreshWidget } from "@/services/widget"
import { recomputePrediction } from "@/stores/prediction-store"
import { useCycles } from "@/hooks/use-cycles"
import { usePrediction } from "@/hooks/use-predictions"
import { useSettings } from "@/hooks/use-settings"

export function useWidget() {
  const { currentCycle } = useCycles()
  const prediction = usePrediction().prediction
  const { avgCycleLength, discreetMode, language } = useSettings()

  useEffect(() => {
    void (async () => {
      // Recompute first so the persisted snapshot carries copy for the
      // current language; refreshing before that would render stale strings.
      await recomputePrediction()
      await refreshWidget()
    })()
    // Language matters even when data is unchanged: the widget re-renders
    // from the snapshot with freshly captured localized copy.
  }, [currentCycle, prediction, avgCycleLength, discreetMode, language])
}
