import { useState, useMemo, useCallback } from "react"
import { Alert } from "react-native"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayLogs } from "@/hooks/use-day-logs"
import { saveDayEntry, type DayEntryInput } from "@/domain/day-entry"
import { refreshAll } from "@/data/refresh"

export function useDayEditor() {
  const { t } = useTranslation()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const { periodLength } = usePrediction()
  const { deleteDayLog, upsertDayLog, getLogForDate } = useDayLogs()

  const existingLog = useMemo(() => {
    if (!selectedDate) return null
    return getLogForDate(format(selectedDate, "yyyy-MM-dd"))
  }, [selectedDate, getLogForDate])

  const close = useCallback(() => setSelectedDate(null), [])
  const open = useCallback((date: Date) => setSelectedDate(date), [])

  const handleSave = useCallback(
    async (entry: DayEntryInput) => {
      try {
        await saveDayEntry(entry, periodLength)
      } catch {
        Alert.alert(t("calendar.saveFailedTitle"), t("calendar.saveFailedBody"))
      }
      setSelectedDate(null)
    },
    [periodLength, t],
  )

  const handleDelete = useCallback(() => {
    if (!existingLog) return
    deleteDayLog(existingLog.id)
      .then(() => refreshAll())
      .catch(() => Alert.alert(t("calendar.deleteFailedTitle"), t("calendar.deleteFailedBody")))
    setSelectedDate(null)
  }, [existingLog, deleteDayLog, t])

  const handleClearPeriod = useCallback(() => {
    if (!existingLog) return
    upsertDayLog({
      date: existingLog.date,
      flowIntensity: "none",
      symptoms: existingLog.symptoms,
      mood: existingLog.mood,
      notes: existingLog.notes,
    })
      .then(() => refreshAll())
      .catch(() => Alert.alert(t("calendar.updateFailedTitle"), t("calendar.updateFailedBody")))
    setSelectedDate(null)
  }, [existingLog, upsertDayLog, t])

  return {
    selectedDate,
    existingLog,
    open,
    close,
    handleSave,
    handleDelete,
    handleClearPeriod,
  }
}
