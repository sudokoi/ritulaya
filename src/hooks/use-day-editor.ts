import { useState, useMemo, useCallback } from "react"
import { format } from "date-fns"
import { isLoggableDate } from "@/utils/date"
import { useDayLogs } from "@/hooks/use-day-logs"
import {
  saveDayEntry,
  deleteDayEntry,
  clearDayEntryFlow,
  type DayEntryInput,
} from "@/domain/day-entry"

export function useDayEditor(initialDate: Date | null = null) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    initialDate && isLoggableDate(initialDate) ? initialDate : null,
  )
  const { getLogForDate } = useDayLogs()

  const existingLog = useMemo(() => {
    if (!selectedDate) return null
    return getLogForDate(format(selectedDate, "yyyy-MM-dd"))
  }, [selectedDate, getLogForDate])

  const close = useCallback(() => setSelectedDate(null), [])
  const open = useCallback((date: Date) => {
    if (isLoggableDate(date)) setSelectedDate(date)
  }, [])

  const handleSave = useCallback(async (entry: DayEntryInput) => {
    await saveDayEntry(entry)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!existingLog) return
    await deleteDayEntry(existingLog.id)
  }, [existingLog])

  const handleClearPeriod = useCallback(async () => {
    if (!existingLog) return
    await clearDayEntryFlow(existingLog.date)
  }, [existingLog])

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
