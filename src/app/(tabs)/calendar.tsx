import { View, Text, ScrollView } from "react-native"
import { useState, useMemo } from "react"
import { format, endOfMonth } from "date-fns"
import { MonthGrid } from "@/components/month-grid"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useCycleDayStates } from "@/hooks/use-cycle-day-states"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayEditor } from "@/hooks/use-day-editor"
import { useTranslation } from "react-i18next"

export default function CalendarScreen() {
  const { t } = useTranslation()
  const [viewedMonth, setViewedMonth] = useState(() => new Date())

  const monthEnd = useMemo(() => endOfMonth(viewedMonth), [viewedMonth])
  const dayStates = useCycleDayStates(monthEnd)
  const { avgCycleLength, periodLength } = usePrediction()
  const { selectedDate, existingLog, open, close, handleSave, handleDelete, handleClearPeriod } =
    useDayEditor()

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="pt-12">
        <View className="flex-row px-4 py-2">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">
              {avgCycleLength}
            </Text>
            <Text className="text-xs text-[var(--text-muted)]">
              {t("calendar.avgCycle")}
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-[var(--text-primary)]">
              {periodLength}
            </Text>
            <Text className="text-xs text-[var(--text-muted)]">
              {t("calendar.periodDays")}
            </Text>
          </View>
        </View>

        <MonthGrid
          currentMonth={viewedMonth}
          onMonthChange={setViewedMonth}
          dayStates={dayStates}
          onDayPress={open}
        />

        <DayDetailSheet
          key={selectedDate ? format(selectedDate, "yyyy-MM-dd") : "closed"}
          visible={selectedDate !== null}
          date={selectedDate ?? new Date()}
          existing={existingLog}
          onSave={handleSave}
          onClearPeriod={existingLog ? handleClearPeriod : undefined}
          onDelete={existingLog ? handleDelete : undefined}
          onClose={close}
        />
      </View>
    </ScrollView>
  )
}
