import { View, Text, ScrollView } from "react-native"
import { useState, useMemo, useCallback } from "react"
import { format } from "date-fns"
import { MonthGrid } from "@/components/month-grid"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useCycles } from "@/hooks/use-cycles"
import { useSettings } from "@/hooks/use-settings"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayLogs } from "@/hooks/use-day-logs"
import { averageCycleLength, deriveCycleDays } from "@/lib/cycle-derivation"
import type { FlowIntensity } from "@/types/day-log"
import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"

export default function CalendarScreen() {
  const { cycles } = useCycles()
  const { avgCycleLength, avgPeriodLength } = useSettings()
  const prediction = usePrediction()
  const { logs, upsertDayLog, getLogForDate } = useDayLogs()
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

  const avgLen = useMemo(
    () => averageCycleLength(cycles, avgCycleLength),
    [cycles, avgCycleLength],
  )

  const handleSave = useCallback(
    (data: {
      flowIntensity: FlowIntensity | null
      symptoms: SymptomKey[]
      mood: MoodKey | null
      notes: string | null
    }) => {
      if (!selectedDate) return
      upsertDayLog({
        date: format(selectedDate, "yyyy-MM-dd"),
        flowIntensity: data.flowIntensity,
        symptoms: data.symptoms,
        mood: data.mood,
        notes: data.notes,
      })
      setSelectedDate(null)
    },
    [selectedDate, upsertDayLog],
  )

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="pt-12">
        <View className="flex-row px-4 py-2">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">
              {avgLen}
            </Text>
            <Text className="text-xs text-[var(--text-muted)]">avg cycle</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">
              {avgPeriodLength}
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
          visible={selectedDate !== null}
          date={selectedDate ?? new Date()}
          existingFlow={existingLog?.flowIntensity}
          existingSymptoms={existingLog?.symptoms ?? []}
          existingMood={existingLog?.mood}
          existingNotes={existingLog?.notes}
          onSave={handleSave}
          onClose={() => setSelectedDate(null)}
        />
      </View>
    </ScrollView>
  )
}
