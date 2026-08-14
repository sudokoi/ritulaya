import { useCallback } from "react"
import * as Haptics from "expo-haptics"
import { logPeriodToday } from "@/stores/cycle-store"
import type { FlowIntensity } from "@/types/day-log"

export function useLogPeriod() {
  return {
    logPeriodToday: useCallback(async (flow: FlowIntensity = "medium") => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await logPeriodToday(flow)
    }, []),
  }
}
