import { useEffect } from "react"
import {
  requestNotificationPermissions,
  updateAllReminders,
} from "@/services/notifications"
import { useSettingsActor } from "./use-settings-actor"
import { usePrediction } from "./use-predictions"

export function useNotifications() {
  const { reminderPeriodAhead, reminderDailyLog, discreetMode } = useSettingsActor()
  const prediction = usePrediction()

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
