import { View, Text, ScrollView, Alert } from "react-native"
import { useState, useMemo, useCallback } from "react"
import { format, endOfMonth } from "date-fns"
import { MonthGrid } from "@/components/month-grid"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useCycleDayStates } from "@/hooks/use-cycle-day-states"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayLogs } from "@/hooks/use-day-logs"
import { refreshAll } from "@/data/refresh"
import { saveDayEntry, type DayEntryInput } from "@/domain/day-entry"

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewedMonth, setViewedMonth] = useState(() => new Date())

  const monthEnd = useMemo(() => endOfMonth(viewedMonth), [viewedMonth])
  const dayStates = useCycleDayStates(monthEnd)
  const { periodLength, avgCycleLength } = usePrediction()
  const { deleteDayLog, upsertDayLog, getLogForDate } = useDayLogs()

  const existingLog = useMemo(() => {
    if (!selectedDate) return null
    return getLogForDate(format(selectedDate, "yyyy-MM-dd"))
  }, [selectedDate, getLogForDate])

  const handleSave = useCallback(
    async (entry: DayEntryInput) => {
      try {
        await saveDayEntry(entry, periodLength)
      } catch {
        Alert.alert("Save failed", "Something went wrong while saving the entry.")
      }
      setSelectedDate(null)
    },
    [periodLength],
  )

  const handleDelete = useCallback(() => {
    if (!existingLog) return
    deleteDayLog(existingLog.id)
      .then(() => refreshAll())
      .catch(() =>
        Alert.alert("Delete failed", "Something went wrong while deleting the entry."),
      )
    setSelectedDate(null)
  }, [existingLog, deleteDayLog])

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
      .catch(() =>
        Alert.alert("Update failed", "Something went wrong while updating the entry."),
      )
    setSelectedDate(null)
  }, [existingLog, upsertDayLog])

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="pt-12">
        <View className="flex-row px-4 py-2">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">
              {avgCycleLength}
            </Text>
            <Text className="text-xs text-[var(--text-muted)]">avg cycle</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">
              {periodLength}
            </Text>
            <Text className="text-xs text-[var(--text-muted)]">period days</Text>
          </View>
        </View>

        <MonthGrid
          currentMonth={viewedMonth}
          onMonthChange={setViewedMonth}
          dayStates={dayStates}
          onDayPress={setSelectedDate}
        />

        <DayDetailSheet
          key={selectedDate ? format(selectedDate, "yyyy-MM-dd") : "closed"}
          visible={selectedDate !== null}
          date={selectedDate ?? new Date()}
          existing={existingLog}
          onSave={handleSave}
          onClearPeriod={existingLog ? handleClearPeriod : undefined}
          onDelete={existingLog ? handleDelete : undefined}
          onClose={() => setSelectedDate(null)}
        />
      </View>
    </ScrollView>
  )
}
