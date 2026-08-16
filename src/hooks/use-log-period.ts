import { useCallback } from "react"
import * as Haptics from "expo-haptics"
import { logPeriodToday } from "@/domain/day-entry"
import { usePrediction } from "@/hooks/use-predictions"
import type { FlowIntensity } from "@/types/day-log"

export function useLogPeriod() {
  const { periodLength } = usePrediction()

  return {
    logPeriodToday: useCallback(
      async (flow: FlowIntensity = "medium") => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        await logPeriodToday(flow, periodLength)
      },
      [periodLength],
    ),
  }
}
