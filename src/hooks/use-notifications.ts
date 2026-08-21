import { useEffect } from "react"
import { differenceInDays } from "date-fns"
import {
  requestNotificationPermissions,
  updateAllReminders,
} from "@/services/notifications"
import { logger } from "@/services/logger"
import { useSettings } from "./use-settings"
import { usePrediction } from "./use-predictions"
import { useCycles } from "./use-cycles"

export function useNotifications() {
  const { reminderPeriodAhead, reminderDailyLog, discreetMode, avgCycleLength } =
    useSettings()
  const prediction = usePrediction().prediction
  const { currentCycle } = useCycles()

  // Overdue = the open cycle has run past the user's typical length.
  const overdue =
    currentCycle != null &&
    differenceInDays(new Date(), new Date(currentCycle.startDate)) + 1 > avgCycleLength

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
      overdue,
    ).catch((e) => logger.warn("notifications", "Reminder scheduling failed", e))
  }, [prediction, reminderPeriodAhead, reminderDailyLog, discreetMode, overdue])
}
