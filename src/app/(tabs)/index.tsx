import { View, ScrollView, ActivityIndicator } from "react-native"
import { useState, useCallback } from "react"
import { format, differenceInCalendarDays, parseISO } from "date-fns"
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
import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"
import { useDateLocale } from "@/hooks/use-date-locale"

const NO_MARKERS = new Map()

export default function TodayScreen() {
  const { t } = useTranslation()
  const locale = useDateLocale()
  const { currentCycle, isLoaded } = useCycles()
  const { discreetMode } = useSettings()
  const { prediction, phase } = usePrediction()
  const { colorScheme } = useColorScheme()
  const insets = useSafeAreaInsets()
  const [today, setToday] = useState(() => new Date())
  const { getLogForDate } = useDayLogs()
  const todayLog = getLogForDate(format(today, "yyyy-MM-dd"))
  const dayStates = useCycleDayStates()
  const editor = useDayEditor()

  useFocusEffect(
    useCallback(() => {
      setToday(new Date())
    }, []),
  )

  const phaseColor =
    colorScheme === "dark" ? PHASE_COLORS[phase].darkHex : PHASE_COLORS[phase].hex
  const cycleDay =
    isLoaded && currentCycle
      ? differenceInCalendarDays(today, parseISO(currentCycle.startDate)) + 1
      : null
  const hasCycleDay = cycleDay !== null && cycleDay > 0

  return (
    <>
      <View className="flex-1 bg-[var(--bg-primary)]" style={{ paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 32 }}>
          <View className="gap-section px-screen">
            <View className="gap-1">
              <AppText variant="screen" accessibilityRole="header">
                {t("tabs.today")}
              </AppText>
              <AppText variant="supporting" tone="muted">
                {format(today, "EEEE, PPP", { locale })}
              </AppText>
            </View>
            {discreetMode ? (
              <View className="gap-3">
                <AppText variant="date">{t("today.privateTitle")}</AppText>
                <AppText variant="supporting" tone="muted">
                  {t("today.privateBody")}
                </AppText>
              </View>
            ) : hasCycleDay ? (
              <View className="gap-5">
                <View className="flex-row flex-wrap items-center gap-5">
                  <AppText
                    variant="cycle"
                    accessibilityLabel={`${t("today.cycleDay")} ${cycleDay}`}
                  >
                    {cycleDay}
                  </AppText>
                  <View className="shrink gap-1">
                    <AppText>{t("today.cycleDay")}</AppText>
                    {prediction ? (
                      <AppText variant="label" style={{ color: phaseColor }}>
                        {t(phaseNameKey(phase))}
                      </AppText>
                    ) : null}
                  </View>
                </View>
                {prediction ? (
                  <View className="gap-2 border-y border-[var(--border)] py-4">
                    <AppText variant="supporting" tone="muted">
                      {t("today.nextPeriodEstimate")}
                    </AppText>
                    <AppText variant="date">
                      {format(prediction.nextPeriodStart, "MMM d", { locale })} –{" "}
                      {format(prediction.nextPeriodEnd, "MMM d", { locale })}
                    </AppText>
                    <AppText variant="supporting" tone="muted">
                      {t("today.couldStart", {
                        start: format(prediction.uncertaintyWindow.start, "MMM d", {
                          locale,
                        }),
                        end: format(prediction.uncertaintyWindow.end, "MMM d", {
                          locale,
                        }),
                      })}
                    </AppText>
                    {prediction.confidence < 0.5 ? (
                      <AppText variant="supporting" tone="muted">
                        {t("today.logMoreCycles")}
                      </AppText>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : isLoaded ? (
              <View className="gap-3">
                <AppText variant="date" accessibilityRole="header">
                  {t("today.noCycleTitle")}
                </AppText>
                <AppText variant="supporting" tone="muted">
                  {t("today.noCycleBody")}
                </AppText>
                {currentCycle === null ? (
                  <Button variant="secondary" onPress={() => router.push("/seed")}>
                    {t("today.setupTitle")}
                  </Button>
                ) : null}
              </View>
            ) : (
              <ActivityIndicator />
            )}
            <TodayCard
              log={todayLog}
              discreet={discreetMode}
              onEdit={() => editor.open(new Date())}
            />
            <View className="gap-3">
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <AppText variant="section" accessibilityRole="header">
                  {t("today.weekTitle")}
                </AppText>
                <Button
                  variant="ghost"
                  onPress={() => router.push("/history")}
                  textClassName="text-[var(--accent)]"
                >
                  {t("history.open")}
                </Button>
              </View>
              <CycleStrip
                centerDate={today}
                dayStates={discreetMode ? NO_MARKERS : dayStates}
                selectedDate={editor.selectedDate ?? today}
                onDayPress={editor.open}
              />
              <AppText variant="supporting" tone="muted">
                {t("today.tapDayToLog")}
              </AppText>
            </View>
            {!discreetMode && hasCycleDay && prediction ? (
              <View className="border-l-2 pl-3" style={{ borderColor: phaseColor }}>
                <AppText variant="supporting" tone="muted">
                  {t(phaseTipKey(phase))}
                </AppText>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
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
