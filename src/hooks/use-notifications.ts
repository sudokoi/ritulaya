import { useEffect } from "react"
import {
  requestNotificationPermissions,
  updateAllReminders,
} from "@/services/notifications"
import { useSettings } from "./use-settings"
import { usePrediction } from "./use-predictions"

export function useNotifications() {
  const { reminderPeriodAhead, reminderDailyLog, discreetMode } = useSettings()
  const prediction = usePrediction().prediction

  useEffect(() => {
    requestNotificationPermissions()
  }, [])

  useEffect(() => {
    updateAllReminders(
      prediction?.nextPeriodStart ?? null,
      reminderPeriodAhead,
      reminderDailyLog,
      discreetMode,
    )
  }, [prediction, reminderPeriodAhead, reminderDailyLog, discreetMode])
}
