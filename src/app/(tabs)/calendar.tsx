import { View, Text, ScrollView } from "react-native"
import { useState, useMemo, useCallback } from "react"
import { format } from "date-fns"
import { MonthGrid } from "@/components/month-grid"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayLogs } from "@/hooks/use-day-logs"
import { logPeriodOnDate } from "@/stores/cycle-store"
import { deriveCycleDays } from "@/lib/cycle-derivation"
import type { FlowIntensity } from "@/types/day-log"
import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"

export default function CalendarScreen() {
  const { prediction, periodLength, avgCycleLength } = usePrediction()
  const { logs, upsertDayLog, deleteDayLog, getLogForDate } = useDayLogs()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const existingLog = useMemo(() => {
    if (!selectedDate) return null
    return getLogForDate(format(selectedDate, "yyyy-MM-dd"))
  }, [selectedDate, getLogForDate])

  const flowDays = useMemo(
    () =>
      logs
        .filter((log) => log.flowIntensity && log.flowIntensity !== "none")
        .map((log) => log.date),
    [logs],
  )

  const { periodDays, predictedDays, fertileDays, ovulationDays } = useMemo(
    () => deriveCycleDays(prediction, flowDays),
    [prediction, flowDays],
  )

  const loggedDays = useMemo(() => logs.map((log) => log.date), [logs])

  const handleSave = useCallback(
    async (data: {
      flowIntensity: FlowIntensity | null
      symptoms: SymptomKey[]
      mood: MoodKey | null
      notes: string | null
    }) => {
      if (!selectedDate) return
      const date = format(selectedDate, "yyyy-MM-dd")
      const flow = data.flowIntensity
      const isPeriod = !!flow && flow !== "none"
      const wasPeriod =
        !!existingLog?.flowIntensity && existingLog.flowIntensity !== "none"

      if (isPeriod && !wasPeriod) {
        await logPeriodOnDate(date, flow, periodLength)
      }

      await upsertDayLog({
        date,
        flowIntensity: data.flowIntensity,
        symptoms: data.symptoms,
        mood: data.mood,
        notes: data.notes,
      })
      setSelectedDate(null)
    },
    [selectedDate, existingLog, upsertDayLog, periodLength],
  )

  const handleDelete = useCallback(() => {
    if (!existingLog) return
    deleteDayLog(existingLog.id)
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
          periodDays={periodDays}
          predictedDays={predictedDays}
          fertileDays={fertileDays}
          ovulationDays={ovulationDays}
          loggedDays={loggedDays}
          onDayPress={setSelectedDate}
        />

        <DayDetailSheet
          key={selectedDate ? format(selectedDate, "yyyy-MM-dd") : "closed"}
          visible={selectedDate !== null}
          date={selectedDate ?? new Date()}
          existingFlow={existingLog?.flowIntensity}
          existingSymptoms={existingLog?.symptoms ?? []}
          existingMood={existingLog?.mood}
          existingNotes={existingLog?.notes}
          onSave={handleSave}
          onClearPeriod={existingLog ? handleClearPeriod : undefined}
          onDelete={existingLog ? handleDelete : undefined}
          onClose={() => setSelectedDate(null)}
        />
      </View>
    </ScrollView>
  )
}
