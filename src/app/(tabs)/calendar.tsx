import { View, Text, ScrollView } from "react-native"
import { useState, useMemo, useCallback } from "react"
import { format, differenceInDays } from "date-fns"
import { MonthGrid } from "@/components/month-grid"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useCycles } from "@/hooks/use-cycles"
import { useSettingsActor } from "@/hooks/use-settings-actor"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayLogs } from "@/hooks/use-day-logs"
import type { FlowIntensity } from "@/types/day-log"
import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"

export default function CalendarScreen() {
  const { cycles } = useCycles()
  const { avgCycleLength, avgPeriodLength } = useSettingsActor()
  const prediction = usePrediction()
  const { logs, upsertDayLog, getLogForDate } = useDayLogs()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const existingLog = useMemo(() => {
    if (!selectedDate) return null
    return getLogForDate(format(selectedDate, "yyyy-MM-dd"))
  }, [selectedDate, getLogForDate])

  const { periodDays, predictedDays, fertileDays, ovulationDays, loggedDays } =
    useMemo(() => {
      const pDays: string[] = []
      cycles.forEach((c) => {
        if (!c.endDate) return
        const start = new Date(c.startDate)
        const end = new Date(c.endDate)
        const d = new Date(start)
        while (d <= end) {
          pDays.push(format(d, "yyyy-MM-dd"))
          d.setDate(d.getDate() + 1)
        }
      })

      const predDays: string[] = []
      if (prediction) {
        const start = prediction.nextPeriodStart
        const end = prediction.nextPeriodEnd
        const d = new Date(start)
        while (d <= end) {
          predDays.push(format(d, "yyyy-MM-dd"))
          d.setDate(d.getDate() + 1)
        }
      }

      const fertDays: string[] = []
      const ovDays: string[] = []
      if (prediction) {
        const d = new Date(prediction.fertileWindow.start)
        while (d <= prediction.fertileWindow.end) {
          fertDays.push(format(d, "yyyy-MM-dd"))
          d.setDate(d.getDate() + 1)
        }
        ovDays.push(format(prediction.ovulationDay, "yyyy-MM-dd"))
      }

      const lDays = logs.map((l) => l.date)

      return {
        periodDays: pDays,
        predictedDays: predDays,
        fertileDays: fertDays,
        ovulationDays: ovDays,
        loggedDays: lDays,
      }
    }, [cycles, prediction, logs])

  const stats = useMemo(() => {
    const completedCycles = cycles.filter((c) => c.endDate !== null)
    let totalLength = 0
    completedCycles.forEach((c) => {
      totalLength += differenceInDays(new Date(c.endDate ?? c.startDate), c.startDate)
    })
    const avgLen =
      completedCycles.length > 0
        ? Math.round(totalLength / completedCycles.length)
        : avgCycleLength

    return { avgLen }
  }, [cycles, avgCycleLength])

  const handleSave = useCallback(
    (data: {
      flowIntensity: FlowIntensity | null
      symptoms: string[]
      mood: string | null
      notes: string | null
    }) => {
      if (!selectedDate) return
      upsertDayLog({
        date: format(selectedDate, "yyyy-MM-dd"),
        flowIntensity: data.flowIntensity,
        symptoms: data.symptoms as SymptomKey[],
        mood: data.mood as MoodKey | null,
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
              {stats.avgLen}
            </Text>
            <Text className="text-xs text-[var(--text-muted)]">avg cycle</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">
              {avgPeriodLength}
            </Text>
            <Text className="text-xs text-[var(--text-muted)]">period days</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">
              {cycles.length > 2 ? "85%" : "--"}
            </Text>
            <Text className="text-xs text-[var(--text-muted)]">regular</Text>
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
          existingFlow={existingLog?.flowIntensity as FlowIntensity | null}
          existingSymptoms={
            existingLog ? (JSON.parse(existingLog.symptoms) as SymptomKey[]) : []
          }
          existingMood={existingLog?.mood as MoodKey | null}
          existingNotes={existingLog?.notes}
          onSave={handleSave}
          onClose={() => setSelectedDate(null)}
        />
      </View>
    </ScrollView>
  )
}
