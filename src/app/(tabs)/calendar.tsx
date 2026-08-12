import { View, Text, ScrollView } from "react-native"
import { useState, useMemo } from "react"
import { format, differenceInDays } from "date-fns"
import { MonthGrid } from "@/components/month-grid"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useCycleActor } from "@/hooks/use-cycle-actor"
import { useSettingsActor } from "@/hooks/use-settings-actor"
import { usePrediction } from "@/hooks/use-predictions"

export default function CalendarScreen() {
  const { cycles } = useCycleActor()
  const { avgCycleLength, avgPeriodLength } = useSettingsActor()
  const prediction = usePrediction()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { periodDays, predictedDays, fertileDays, ovulationDays, loggedDays } =
    useMemo(() => {
      const pDays: string[] = []
      cycles.forEach((c) => {
        if (!c.endDate) return
        const start = new Date(c.startDate)
        const end = new Date(c.endDate)
        let d = new Date(start)
        while (d <= end) {
          pDays.push(format(d, "yyyy-MM-dd"))
          d = new Date(d.getTime() + 86400000)
        }
      })

      const predDays: string[] = []
      if (prediction) {
        const start = prediction.nextPeriodStart
        const end = prediction.nextPeriodEnd
        let d = new Date(start)
        while (d <= end) {
          predDays.push(format(d, "yyyy-MM-dd"))
          d = new Date(d.getTime() + 86400000)
        }
      }

      const fertDays: string[] = []
      const ovDays: string[] = []
      if (prediction) {
        let d = new Date(prediction.fertileWindow.start)
        while (d <= prediction.fertileWindow.end) {
          fertDays.push(format(d, "yyyy-MM-dd"))
          d = new Date(d.getTime() + 86400000)
        }
        ovDays.push(format(prediction.ovulationDay, "yyyy-MM-dd"))
      }

      return {
        periodDays: pDays,
        predictedDays: predDays,
        fertileDays: fertDays,
        ovulationDays: ovDays,
        loggedDays: [],
      }
    }, [cycles, prediction])

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
          onSave={() => {
            setSelectedDate(null)
          }}
          onClose={() => setSelectedDate(null)}
        />
      </View>
    </ScrollView>
  )
}
