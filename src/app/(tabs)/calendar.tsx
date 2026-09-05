import { View, ScrollView } from "react-native"
import { useState, useMemo } from "react"
import { format, endOfMonth } from "date-fns"
import { MonthGrid } from "@/components/month-grid"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useCycleDayStates } from "@/hooks/use-cycle-day-states"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayEditor } from "@/hooks/use-day-editor"
import { useTranslation } from "react-i18next"
import { router } from "expo-router"
import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSettings } from "@/hooks/use-settings"

export default function CalendarScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { discreetMode } = useSettings()
  const [viewedMonth, setViewedMonth] = useState(() => new Date())

  const monthEnd = useMemo(() => endOfMonth(viewedMonth), [viewedMonth])
  const dayStates = useCycleDayStates(monthEnd)
  const { avgCycleLength, periodLength } = usePrediction()
  const {
    selectedDate,
    existingLog,
    open,
    close,
    handleSave,
    handleDelete,
    handleClearPeriod,
  } = useDayEditor()

  return (
    <View className="flex-1 bg-[var(--bg-primary)]" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="gap-section px-screen pt-5">
          <View className="gap-2">
            <AppText variant="screen" accessibilityRole="header">
              {t("tabs.calendar")}
            </AppText>
            <Button
              variant="ghost"
              className="w-full"
              textClassName="grow text-[var(--accent)]"
              onPress={() => router.push("/history")}
            >
              {t("history.open")}
            </Button>
          </View>
          {discreetMode ? (
            <AppText variant="supporting" tone="muted">
              {t("today.privateBody")}
            </AppText>
          ) : (
            <View className="flex-row flex-wrap gap-5 rounded-card bg-[var(--bg-surface)] p-screen">
              <View className="grow gap-1">
                <AppText variant="date">{avgCycleLength}</AppText>
                <AppText variant="supporting" tone="muted">
                  {t("calendar.avgCycle")}
                </AppText>
              </View>
              <View className="grow gap-1">
                <AppText variant="date">{periodLength}</AppText>
                <AppText variant="supporting" tone="muted">
                  {t("calendar.periodDays")}
                </AppText>
              </View>
            </View>
          )}

          <MonthGrid
            currentMonth={viewedMonth}
            onMonthChange={setViewedMonth}
            dayStates={dayStates}
            discreet={discreetMode}
            onDayPress={open}
          />
          <AppText variant="supporting" tone="muted">
            {t("today.tapDayToLog")}
          </AppText>
        </View>
      </ScrollView>
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
  )
}
