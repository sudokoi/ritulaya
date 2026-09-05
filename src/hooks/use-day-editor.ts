import { useState, useMemo, useCallback } from "react"
import { format } from "date-fns"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayLogs } from "@/hooks/use-day-logs"
import { saveDayEntry, type DayEntryInput } from "@/domain/day-entry"
import { refreshAll } from "@/data/refresh"

export function useDayEditor() {
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
      await saveDayEntry(entry, periodLength)
    },
    [periodLength],
  )

  const handleDelete = useCallback(async () => {
    if (!existingLog) return
    await deleteDayLog(existingLog.id)
    await refreshAll()
  }, [existingLog, deleteDayLog])

  const handleClearPeriod = useCallback(async () => {
    if (!existingLog) return
    await upsertDayLog({
      date: existingLog.date,
      flowIntensity: "none",
      symptoms: existingLog.symptoms,
      mood: existingLog.mood,
      notes: existingLog.notes,
    })
    await refreshAll()
  }, [existingLog, upsertDayLog])

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
