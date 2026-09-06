import { useEffect } from "react"
import { differenceInDays } from "date-fns"
import { useTranslation } from "react-i18next"
import { updateAllReminders } from "@/services/notifications"
import { logger } from "@/services/logger"
import { useSettings } from "./use-settings"
import { usePrediction } from "./use-predictions"
import { useCycles } from "./use-cycles"
import { useSelector } from "@xstate/store-react"
import { dataStore } from "@/stores/data-store"

export function useNotifications() {
  const refreshFailed = useSelector(dataStore, (state) => state.context.refreshFailed)
  const settingsWrites = useSelector(dataStore, (state) => state.context.settingsWrites)
  const version = useSelector(dataStore, (state) => state.context.version)
  const refreshing = useSelector(dataStore, (state) => state.context.refreshing)
  const {
    reminderPeriodAhead,
    reminderDailyLog,
    discreetMode,
    avgCycleLength,
    language: languageSetting,
  } = useSettings()
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
    if (refreshFailed || refreshing || settingsWrites > 0) return
    updateAllReminders(
      prediction?.nextPeriodStart ?? null,
      reminderPeriodAhead,
      reminderDailyLog,
      discreetMode,
      overdue,
      languageSetting,
    ).catch((e) => logger.warn("notifications", "Reminder scheduling failed", e))
  }, [
    prediction,
    reminderPeriodAhead,
    reminderDailyLog,
    discreetMode,
    overdue,
    language,
    refreshFailed,
    settingsWrites,
    version,
    refreshing,
    languageSetting,
  ])
}
