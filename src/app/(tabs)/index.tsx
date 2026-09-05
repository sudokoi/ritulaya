import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native"
import { useState, useCallback, useMemo } from "react"
import { format, differenceInCalendarDays, parseISO, isToday } from "date-fns"
import { useFocusEffect, router } from "expo-router"
import { useColorScheme } from "nativewind"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { CycleStrip } from "@/components/cycle-strip"
import { TodayCard } from "@/components/today-card"
import { DayDetailSheet } from "@/components/day-detail-sheet"
import { useDayEditor } from "@/hooks/use-day-editor"
import { useCycles } from "@/hooks/use-cycles"
import { useSettings } from "@/hooks/use-settings"
import { usePrediction } from "@/hooks/use-predictions"
import { useDayLogs } from "@/hooks/use-day-logs"
import { useCycleDayStates } from "@/hooks/use-cycle-day-states"
import { phaseNameKey, phaseTipKey } from "@/lib/phase"
import { useTranslation } from "react-i18next"
import { PHASE_COLORS } from "@/constants/phase-colors"
import { symptomLabel, moodLabel } from "@/domain/day-entry-display"
import { DayCircle } from "@/components/day-circle"
import { flowLevelStyle } from "@/lib/day-colors"
import { Button } from "@/components/ui/button"

export default function TodayScreen() {
  const { t } = useTranslation()
  const { currentCycle, isLoaded } = useCycles()
  const { avgCycleLength } = useSettings()
  const { prediction, phase } = usePrediction()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"
  const insets = useSafeAreaInsets()
  const [today, setToday] = useState(() => new Date())
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(() => new Date())

  const { todayLog, getLogForDate } = useDayLogs()
  const dayStates = useCycleDayStates()
  const editor = useDayEditor()

  const openDay = (date: Date) => {
    setSelectedWeekDate(date)
    editor.open(date)
  }

  useFocusEffect(
    useCallback(() => {
      const now = new Date()
      setToday(now)
      setSelectedWeekDate((prev) => (isToday(prev) ? now : prev))
    }, []),
  )

  const daysUntilPeriod = prediction
    ? Math.max(0, differenceInCalendarDays(prediction.nextPeriodStart, today))
    : 0

  const phaseColor = PHASE_COLORS[phase].hex
  const phaseTextColor = dark ? PHASE_COLORS[phase].darkHex : phaseColor

  const cycleDay =
    isLoaded && currentCycle
      ? differenceInCalendarDays(today, parseISO(currentCycle.startDate)) + 1
      : null
  const hasCycleDay = cycleDay !== null && cycleDay > 0

  const selectedWeekLog = useMemo(
    () => getLogForDate(format(selectedWeekDate, "yyyy-MM-dd")),
    [selectedWeekDate, getLogForDate],
  )
  const translate = t as unknown as (k: string) => string
  const selectedFlowStyle = flowLevelStyle(selectedWeekLog?.flowIntensity ?? null, dark)

  // Low-confidence predictions soften the copy so a single number never
  // implies more precision than the history supports.
  const lowConfidence = (prediction?.confidence ?? 0) < 0.5

  return (
    <>
      <ScrollView className="flex-1 bg-[var(--bg-primary)]">
        <View className="items-center px-6 pb-6" style={{ paddingTop: insets.top + 24 }}>
          {hasCycleDay ? (
            <>
              <Text className="text-7xl font-bold text-[var(--text-primary)]">
                {cycleDay}
              </Text>
              <Text className="text-base text-[var(--text-muted)]">
                {t("today.cycleDay")}
              </Text>
              {prediction ? (
                <>
                  <View className="mt-3 flex-row items-center gap-2">
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: phaseColor }}
                    />
                    <Text
                      className="text-lg font-medium"
                      style={{ color: phaseTextColor }}
                    >
                      {t(phaseNameKey(phase))}
                    </Text>
                  </View>
                  <View className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                    <View
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: phaseColor,
                        width: `${Math.min((cycleDay / avgCycleLength) * 100, 100)}%`,
                      }}
                    />
                  </View>
                  <Text className="mt-2 text-base text-[var(--text-muted)]">
                    {lowConfidence
                      ? t("today.roughlyDaysUntil", { count: daysUntilPeriod })
                      : t("today.daysUntil", { count: daysUntilPeriod })}
                  </Text>
                  <Text className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {format(prediction.nextPeriodStart, "MMM d")} —{" "}
                    {format(prediction.nextPeriodEnd, "MMM d")}
                  </Text>
                  <Text className="mt-1 text-center text-sm text-[var(--text-muted)]">
                    {t("today.couldStart", {
                      start: format(prediction.uncertaintyWindow.start, "MMM d"),
                      end: format(prediction.uncertaintyWindow.end, "MMM d"),
                    })}
                  </Text>
                  {lowConfidence ? (
                    <Text className="mt-2 text-xs text-[var(--text-muted)] opacity-70">
                      {t("today.logMoreCycles")}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </>
          ) : isLoaded ? (
            <>
              <Text
                accessibilityRole="header"
                className="text-center text-2xl font-bold text-[var(--text-primary)]"
              >
                {t("today.noCycleTitle")}
              </Text>
              <Text className="mt-3 text-center text-base leading-6 text-[var(--text-muted)]">
                {t("today.noCycleBody")}
              </Text>
            </>
          ) : (
            <ActivityIndicator />
          )}
        </View>

        {isLoaded && currentCycle === null ? (
          <Pressable
            className="mx-4 mb-4 rounded-card bg-[var(--bg-surface)] px-5 py-4 active:opacity-60"
            onPress={() => router.push("/seed")}
            accessibilityRole="button"
            accessibilityLabel={t("today.setupTitle")}
          >
            <Text className="text-base font-semibold text-[var(--text-primary)]">
              {t("today.setupTitle")}
            </Text>
            <Text className="mt-1 text-sm text-[var(--text-muted)]">
              {t("today.setupBody")}
            </Text>
          </Pressable>
        ) : null}

        <TodayCard log={todayLog} onEdit={() => openDay(new Date())} />

        <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
          <View className="mb-4 flex-row flex-wrap items-center justify-between">
            <Text className="text-sm font-medium text-[var(--text-muted)]">
              {t("today.sectionWeek")}
            </Text>
            <Button variant="ghost" size="md" onPress={() => router.push("/history")}>
              {t("history.open")}
            </Button>
          </View>
          <CycleStrip
            centerDate={today}
            span={7}
            dayStates={dayStates}
            selectedDate={selectedWeekDate}
            onDayPress={openDay}
          />
          <Text className="mt-3 text-center text-sm text-[var(--text-muted)]">
            {t("today.tapDayToLog")}
          </Text>

          <View className="mt-4 rounded-card bg-[var(--bg-primary)] px-4 py-4">
            <Text className="text-sm font-medium text-[var(--text-primary)]">
              {format(selectedWeekDate, "EEE, MMM d")}
              {isToday(selectedWeekDate) ? ` • ${t("calendar.today")}` : ""}
            </Text>

            {selectedWeekLog ? (
              <>
                <View className="mt-3 flex-row items-center gap-3">
                  {selectedWeekLog.flowIntensity &&
                  selectedWeekLog.flowIntensity !== "none" ? (
                    <DayCircle
                      size={24}
                      fill={selectedFlowStyle.fill}
                      colors={selectedFlowStyle.colors}
                      opacity={selectedFlowStyle.opacity}
                    />
                  ) : (
                    <View className="h-6 w-6 rounded-full bg-[var(--bg-muted)]" />
                  )}
                  <Text className="text-sm text-[var(--text-primary)]">
                    {translate(`flow.${selectedWeekLog.flowIntensity ?? "none"}`)}
                  </Text>
                </View>

                <View className="mt-3 flex-row flex-wrap gap-2">
                  {selectedWeekLog.symptoms.length > 0
                    ? selectedWeekLog.symptoms.map((symptom) => (
                        <View
                          key={symptom}
                          className="rounded-pill bg-[var(--bg-muted)] px-3 py-1.5"
                        >
                          <Text className="text-xs text-[var(--text-primary)]">
                            {symptomLabel(symptom, translate)}
                          </Text>
                        </View>
                      ))
                    : null}
                  {selectedWeekLog.mood ? (
                    <View className="rounded-pill bg-[var(--bg-muted)] px-3 py-1.5">
                      <Text className="text-xs text-[var(--text-primary)]">
                        {moodLabel(selectedWeekLog.mood, translate)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {selectedWeekLog.notes ? (
                  <Text className="mt-3 text-sm text-[var(--text-muted)]">
                    {selectedWeekLog.notes}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text className="mt-2 text-sm text-[var(--text-muted)]">
                {t("today.nothingLogged")}
              </Text>
            )}

            <Pressable
              onPress={() => editor.open(selectedWeekDate)}
              className="mt-4 min-h-11 justify-center self-start active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel={t(
                selectedWeekLog ? "today.editEntry" : "today.logEntry",
              )}
            >
              <Text className="text-sm font-medium text-[var(--accent)]">
                {t(selectedWeekLog ? "today.editEntry" : "today.logEntry")}
              </Text>
            </Pressable>
          </View>
        </View>

        {hasCycleDay && prediction ? (
          <View
            className="mx-4 mt-4 mb-8 rounded-card px-5 py-4"
            style={{ backgroundColor: `${phaseTextColor}1f` }}
          >
            <Text className="text-sm font-medium" style={{ color: phaseTextColor }}>
              {t(phaseTipKey(phase))}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <DayDetailSheet
        key={editor.selectedDate ? format(editor.selectedDate, "yyyy-MM-dd") : "closed"}
        visible={editor.selectedDate !== null}
        date={editor.selectedDate ?? new Date()}
        existing={editor.existingLog}
        onSave={editor.handleSave}
        onClearPeriod={editor.existingLog ? editor.handleClearPeriod : undefined}
        onDelete={editor.existingLog ? editor.handleDelete : undefined}
        onClose={editor.close}
      />
    </>
  )
}
