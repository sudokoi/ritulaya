import { View, Alert } from "react-native"
import { router } from "expo-router"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayLogs } from "@/hooks/use-day-logs"
import { todayISO } from "@/utils/date"
import { saveDayEntry, type DayEntryInput } from "@/domain/day-entry"

/**
 * Deep-link target for the home-screen widget: opens today's day entry
 * sheet directly so a single tap lands in the logging flow.
 */
export default function LogTodayScreen() {
  const { getLogForDate } = useDayLogs()
  const { periodLength } = usePrediction()
  const existing = getLogForDate(todayISO())

  return (
    <View className="flex-1 bg-black/30">
      <DayDetailSheet
        key="log-today"
        visible
        date={new Date()}
        existing={existing}
        onSave={(entry: DayEntryInput) => {
          // The sheet closes itself via onClose, which owns the navigation
          // pop; here we only surface save failures.
          saveDayEntry(entry, periodLength).catch(() =>
            Alert.alert("Save failed", "Something went wrong while saving the entry."),
          )
        }}
        onClose={() => router.back()}
      />
    </View>
  )
}
