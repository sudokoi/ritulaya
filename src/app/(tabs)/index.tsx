import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { useMemo } from "react"
import { format, addDays, isToday } from "date-fns"
import { WeekStrip } from "@/components/week-strip"
import { cn } from "@/lib/utils"

const periodDays = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"]
const predictedDays = ["2026-08-29", "2026-08-30", "2026-08-31"]
const fertileDays = ["2026-08-12", "2026-08-13"]

const moodChips = ["😊 Happy", "🤍 Cramps", "💤 Tired"]

export default function TodayScreen() {
  const weekDays = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(today, i - 3)
      const iso = format(date, "yyyy-MM-dd")
      return {
        date,
        label: format(date, "EEEEE"),
        isPeriod: periodDays.includes(iso),
        isPredicted: predictedDays.includes(iso),
        isFertile: fertileDays.includes(iso),
        isToday: isToday(date),
      }
    })
  }, [])

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="items-center px-6 pt-14 pb-6">
        <Text className="text-7xl font-bold text-[var(--text-primary)]">14</Text>
        <View className="mt-3 flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-follicular" />
          <Text className="text-lg font-medium text-follicular">Ovulation Phase</Text>
        </View>
        <View className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-[var(--border-light)]">
          <View className="h-full w-1/2 rounded-full bg-follicular" />
        </View>
        <Text className="mt-2 text-sm text-[var(--text-muted)]">
          14 days until next period
        </Text>
      </View>

      <TouchableOpacity
        className="mx-4 mb-4 rounded-card bg-menstrual px-6 py-4"
        activeOpacity={0.8}
      >
        <Text className="text-center text-lg font-semibold text-white">
          Log Period Today
        </Text>
      </TouchableOpacity>

      <View className="mx-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-4 text-sm font-medium text-[var(--text-muted)]">TODAY</Text>
        <View className="mb-3 flex-row justify-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              className={cn(
                "h-8 w-8 rounded-full",
                i < 1 ? "bg-menstrual" : "bg-[var(--border-light)]",
              )}
            />
          ))}
        </View>
        <View className="flex-row flex-wrap gap-2">
          {moodChips.map((chip) => (
            <View key={chip} className="rounded-pill bg-[var(--border-light)] px-4 py-2">
              <Text className="text-sm text-[var(--text-primary)]">{chip}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-4 text-sm font-medium text-[var(--text-muted)]">
          THIS WEEK
        </Text>
        <WeekStrip days={weekDays} />
      </View>

      <View className="mx-4 mt-4 mb-8 rounded-card bg-luteal/10 px-5 py-4">
        <Text className="text-sm font-medium text-luteal">
          Your energy peaks now. Great time for intense workouts & social plans.
        </Text>
      </View>
    </ScrollView>
  )
}
