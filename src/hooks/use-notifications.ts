import { useEffect } from "react"
import {
  requestNotificationPermissions,
  updateAllReminders,
} from "@/services/notifications"
import { logger } from "@/services/logger"
import { useSettings } from "./use-settings"
import { usePrediction } from "./use-predictions"

export function useNotifications() {
  const { reminderPeriodAhead, reminderDailyLog, discreetMode } = useSettings()
  const prediction = usePrediction().prediction

  useEffect(() => {
    requestNotificationPermissions().catch((e) =>
      logger.warn("notifications", "Permission request failed", e),
    )
  }, [])

  useEffect(() => {
    updateAllReminders(
      prediction?.nextPeriodStart ?? null,
      reminderPeriodAhead,
      reminderDailyLog,
      discreetMode,
    ).catch((e) => logger.warn("notifications", "Reminder scheduling failed", e))
  }, [prediction, reminderPeriodAhead, reminderDailyLog, discreetMode])
}
