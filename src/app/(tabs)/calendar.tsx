import { View, Text, ScrollView } from "react-native"
import { useState } from "react"
import { MonthGrid } from "@/components/month-grid"
import { DayDetailSheet } from "@/components/day-detail-sheet"

const mockPeriodDays = [
  "2026-08-01",
  "2026-08-02",
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
]
const mockPredictedDays = ["2026-08-29", "2026-08-30", "2026-08-31"]
const mockFertileDays = ["2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15"]
const mockOvulationDays = ["2026-08-14"]
const mockLoggedDays = ["2026-08-03", "2026-08-10"]

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="pt-12">
        <View className="flex-row px-4 py-2">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">28</Text>
            <Text className="text-xs text-[var(--text-muted)]">avg cycle</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">5</Text>
            <Text className="text-xs text-[var(--text-muted)]">period days</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">85%</Text>
            <Text className="text-xs text-[var(--text-muted)]">regular</Text>
          </View>
        </View>

        <MonthGrid
          periodDays={mockPeriodDays}
          predictedDays={mockPredictedDays}
          fertileDays={mockFertileDays}
          ovulationDays={mockOvulationDays}
          loggedDays={mockLoggedDays}
          onDayPress={setSelectedDate}
        />

        <DayDetailSheet
          visible={selectedDate !== null}
          date={selectedDate ?? new Date()}
          onSave={(data) => {
            console.log("Save day log", data)
            setSelectedDate(null)
          }}
          onClose={() => setSelectedDate(null)}
        />
      </View>
    </ScrollView>
  )
}
