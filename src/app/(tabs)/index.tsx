import { View, Text, ScrollView, Pressable } from "react-native"
import { useMemo, useCallback } from "react"
import { format, addDays, isToday, differenceInDays } from "date-fns"
import { useFocusEffect, router } from "expo-router"
import { useColorScheme } from "nativewind"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { WeekStrip } from "@/components/week-strip"
import { useCycles } from "@/hooks/use-cycles"
import { useSettings } from "@/hooks/use-settings"
import { usePrediction } from "@/hooks/use-predictions"
import { useNotifications } from "@/hooks/use-notifications"
import { useLogPeriod } from "@/hooks/use-log-period"
import { useDayLogs } from "@/hooks/use-day-logs"
import { useCycleDayStates } from "@/hooks/use-cycle-day-states"
import { refreshAll } from "@/data/refresh"
import { cn } from "@/lib/utils"
import { phaseNameKey, phaseTipKey } from "@/lib/phase"
import { useTranslation } from "react-i18next"
import { PHASE_COLORS } from "@/constants/phase-colors"

export default function TodayScreen() {
  const { t } = useTranslation()
  const { currentCycle, isLoaded } = useCycles()
  const { avgCycleLength } = useSettings()
  const { prediction, phase } = usePrediction()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"
  const insets = useSafeAreaInsets()
  const today = useMemo(() => new Date(), [])
  useNotifications()

  const { todayLog } = useDayLogs()
  const { logPeriodToday } = useLogPeriod()
  const dayStates = useCycleDayStates()

  useFocusEffect(
    useCallback(() => {
      void refreshAll()
    }, []),
  )

  const daysUntilPeriod = prediction
    ? Math.max(0, differenceInDays(prediction.nextPeriodStart, today))
    : 14

  const phaseColor = PHASE_COLORS[phase].hex
  const phaseTextColor = dark ? PHASE_COLORS[phase].darkHex : phaseColor

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(today, i - 3)
      return {
        date,
        label: format(date, "EEEEE"),
        isToday: isToday(date),
        state: dayStates.get(format(date, "yyyy-MM-dd")) ?? {
          period: false,
          predicted: false,
          uncertain: false,
          fertile: 0,
          ovulation: false,
          logged: false,
        },
      }
    })
  }, [dayStates, today])

  const cycleDay = currentCycle
    ? Math.max(1, differenceInDays(today, new Date(currentCycle.startDate)) + 1)
    : "-"

  // Low-confidence predictions soften the copy so a single number never
  // implies more precision than the history supports.
  const lowConfidence = (prediction?.confidence ?? 0) < 0.5

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="items-center px-6 pb-6" style={{ paddingTop: insets.top + 24 }}>
        <Text className="text-7xl font-bold text-[var(--text-primary)]">
          {isLoaded ? cycleDay : "-"}
        </Text>
        <View className="mt-3 flex-row items-center gap-2">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: phaseColor }}
          />
          <Text className="text-lg font-medium" style={{ color: phaseTextColor }}>
            {t(phaseNameKey(phase))}
          </Text>
        </View>
        <View className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-[var(--bg-muted)]">
          <View
            className="h-full rounded-full"
            style={{
              backgroundColor: phaseColor,
              width: `${Math.min(((cycleDay === "-" ? 14 : (cycleDay as number)) / avgCycleLength) * 100, 100)}%`,
            }}
          />
        </View>
        <Text className="mt-2 text-sm text-[var(--text-muted)]">
          {lowConfidence
            ? t("today.roughlyDaysUntil", { count: daysUntilPeriod })
            : t("today.daysUntil", { count: daysUntilPeriod })}
        </Text>
        {prediction ? (
          <>
            <Text className="mt-1 text-xs text-[var(--text-muted)]">
              {format(prediction.nextPeriodStart, "MMM d")} —{" "}
              {format(prediction.nextPeriodEnd, "MMM d")}
            </Text>
            <Text className="mt-0.5 text-xs text-[var(--text-muted)] opacity-70">
              {t("today.couldStart", {
                start: format(prediction.uncertaintyWindow.start, "MMM d"),
                end: format(prediction.uncertaintyWindow.end, "MMM d"),
              })}
            </Text>
          </>
        ) : null}
        {lowConfidence ? (
          <Text className="mt-2 text-xs text-[var(--text-muted)] opacity-70">
            {t("today.logMoreCycles")}
          </Text>
        ) : null}
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

      <Pressable
        className="mx-4 mb-4 rounded-card bg-accent px-6 py-4 active:opacity-60"
        onPress={() => logPeriodToday()}
        accessibilityRole="button"
        accessibilityLabel={t("today.logPeriodA11y")}
      >
        <Text className="text-center text-lg font-semibold text-white">
          {t("today.logPeriodToday")}
        </Text>
      </Pressable>

      <View className="mx-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-4 text-sm font-medium text-[var(--text-muted)]">
          {t("today.sectionToday")}
        </Text>
        {todayLog ? (
          <>
            <View className="mb-3 flex-row justify-center gap-2">
              {(["none", "spotting", "light", "medium", "heavy"] as const).map(
                (level) => (
                  <View
                    key={level}
                    className={cn(
                      "h-8 w-8 rounded-full",
                      todayLog.flowIntensity === level
                        ? "bg-accent"
                        : "bg-[var(--bg-muted)]",
                    )}
                  />
                ),
              )}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {todayLog.symptoms.length > 0
                ? todayLog.symptoms.map((symptom) => (
                    <View
                      key={symptom}
                      className="rounded-pill bg-[var(--bg-muted)] px-4 py-2"
                    >
                      <Text className="text-sm text-[var(--text-primary)]">
                        {symptom}
                      </Text>
                    </View>
                  ))
                : null}
              {todayLog.mood ? (
                <Text className="text-sm text-[var(--text-muted)]">{todayLog.mood}</Text>
              ) : null}
            </View>
          </>
        ) : (
          <Text className="text-sm text-[var(--text-muted)]">
            {t("today.nothingLogged")}
          </Text>
        )}
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-4 text-sm font-medium text-[var(--text-muted)]">
          {t("today.sectionWeek")}
        </Text>
        <WeekStrip days={weekDays} />
      </View>

      <View
        className="mx-4 mt-4 mb-8 rounded-card px-5 py-4"
        style={{ backgroundColor: `${phaseTextColor}1f` }}
      >
        <Text className="text-sm font-medium" style={{ color: phaseTextColor }}>
          {t(phaseTipKey(phase))}
        </Text>
      </View>
    </ScrollView>
  )
}
