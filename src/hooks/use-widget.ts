import { useEffect } from "react"
import { differenceInDays } from "date-fns"
import { updateWidget } from "@/services/widget"
import { useCycles } from "@/hooks/use-cycles"
import { usePrediction } from "@/hooks/use-predictions"
import { useSettings } from "@/hooks/use-settings"
import { getPhase } from "@/lib/phase"

export function useWidget() {
  const { currentCycle } = useCycles()
  const prediction = usePrediction().prediction
  const { avgCycleLength, discreetMode } = useSettings()

  useEffect(() => {
    const today = new Date()
    const dayNumber = currentCycle
      ? differenceInDays(today, new Date(currentCycle.startDate)) + 1
      : 0
    const daysUntilNext = prediction
      ? differenceInDays(prediction.nextPeriodStart, today)
      : 0
    const phase = getPhase(daysUntilNext, avgCycleLength)

    void updateWidget(dayNumber, phase, daysUntilNext, discreetMode)
  }, [currentCycle, prediction, avgCycleLength, discreetMode])
}
