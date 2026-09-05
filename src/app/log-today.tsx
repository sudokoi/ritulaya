import { View } from "react-native"
import { router } from "expo-router"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useDayEditor } from "@/hooks/use-day-editor"

/**
 * Deep-link target for the home-screen widget: opens today's day entry
 * sheet directly so a single tap lands in the logging flow.
 */
export default function LogTodayScreen() {
  const { selectedDate, existingLog, handleSave } = useDayEditor(new Date())

  return (
    <View className="flex-1 bg-black/30">
      <DayDetailSheet
        key="log-today"
        visible
        date={selectedDate ?? new Date()}
        existing={existingLog}
        onSave={handleSave}
        onClose={() => {
          // Cold start from the widget deep link has no history to pop;
          // fall back to the Today tab instead of exiting the app.
          if (router.canGoBack()) router.back()
          else router.replace("/(tabs)")
        }}
      />
    </View>
  )
}
