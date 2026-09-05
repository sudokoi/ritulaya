import { useEffect } from "react"
import { differenceInDays } from "date-fns"
import { useTranslation } from "react-i18next"
import { updateAllReminders } from "@/services/notifications"
import { logger } from "@/services/logger"
import { useSettings } from "./use-settings"
import { usePrediction } from "./use-predictions"
import { useCycles } from "./use-cycles"

export function useNotifications() {
  const { reminderPeriodAhead, reminderDailyLog, discreetMode, avgCycleLength } =
    useSettings()
  const prediction = usePrediction().prediction
  const { currentCycle } = useCycles()
  // Scheduled notification copy is frozen at schedule time, so reminders are
  // re-scheduled whenever the active language changes.
  const { i18n } = useTranslation()
  const language = i18n.language

  // Overdue = the open cycle has run past the user's typical length.
  const overdue =
    currentCycle != null &&
    differenceInDays(new Date(), new Date(currentCycle.startDate)) + 1 > avgCycleLength

  useEffect(() => {
    updateAllReminders(
      prediction?.nextPeriodStart ?? null,
      reminderPeriodAhead,
      reminderDailyLog,
      discreetMode,
      overdue,
    ).catch((e) => logger.warn("notifications", "Reminder scheduling failed", e))
  }, [prediction, reminderPeriodAhead, reminderDailyLog, discreetMode, overdue, language])
}
