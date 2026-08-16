import { View, Text, ScrollView, Pressable } from "react-native"
import { useMemo, useCallback } from "react"
import { format, addDays, isToday, differenceInDays } from "date-fns"
import { useFocusEffect } from "expo-router"
import { useColorScheme } from "nativewind"
import { WeekStrip } from "@/components/week-strip"
import { useCycles } from "@/hooks/use-cycles"
import { useSettings } from "@/hooks/use-settings"
import { usePrediction } from "@/hooks/use-predictions"
import { useNotifications } from "@/hooks/use-notifications"
import { useLogPeriod } from "@/hooks/use-log-period"
import { useDayLogs } from "@/hooks/use-day-logs"
import { cn } from "@/lib/utils"
import { PHASE_TIPS, PHASE_NAMES } from "@/lib/phase"
import { deriveCycleDays, fertileFractions } from "@/lib/cycle-derivation"
import { PHASE_COLORS } from "@/constants/phase-colors"

export default function TodayScreen() {
  const { currentCycle, isLoaded, load } = useCycles()
  const { avgCycleLength } = useSettings()
  const { prediction, phase } = usePrediction()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"
  const today = useMemo(() => new Date(), [])
  useNotifications()

  const { loadDayLogs, todayLog, logs } = useDayLogs()
  const { logPeriodToday } = useLogPeriod()

  useFocusEffect(
    useCallback(() => {
      load()
      loadDayLogs()
    }, [load, loadDayLogs]),
  )

  const daysUntilPeriod = prediction
    ? Math.max(0, differenceInDays(prediction.nextPeriodStart, today))
    : 14

  const phaseColor = PHASE_COLORS[phase].hex
  const phaseTextColor = dark ? PHASE_COLORS[phase].darkHex : phaseColor

  const flowDays = useMemo(
    () =>
      logs
        .filter((log) => log.flowIntensity && log.flowIntensity !== "none")
        .map((log) => log.date),
    [logs],
  )

  const { periodDays, predictedDays, fertileDays, ovulationDays } = useMemo(
    () => deriveCycleDays(prediction, flowDays),
    [prediction, flowDays],
  )

  const fertileMap = useMemo(() => fertileFractions(fertileDays), [fertileDays])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(today, i - 3)
      const iso = format(date, "yyyy-MM-dd")
      return {
        date,
        label: format(date, "EEEEE"),
        isPeriod: periodDays.includes(iso),
        isPredicted: predictedDays.includes(iso),
        fertile: fertileMap.get(iso) ?? 0,
        isOvulation: ovulationDays.includes(iso),
        isToday: isToday(date),
      }
    })
  }, [periodDays, predictedDays, fertileMap, ovulationDays, today])

  const cycleDay = currentCycle
    ? Math.max(1, differenceInDays(today, new Date(currentCycle.startDate)) + 1)
    : "-"

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="items-center px-6 pt-14 pb-6">
        <Text className="text-7xl font-bold text-[var(--text-primary)]">
          {isLoaded ? cycleDay : "-"}
        </Text>
        <View className="mt-3 flex-row items-center gap-2">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: phaseColor }}
          />
          <Text className="text-lg font-medium" style={{ color: phaseTextColor }}>
            {PHASE_NAMES[phase]}
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
          {daysUntilPeriod} days until next period
        </Text>
        {prediction && (
          <Text className="mt-1 text-xs text-[var(--text-muted)]">
            {format(prediction.nextPeriodStart, "MMM d")} —{" "}
            {format(prediction.nextPeriodEnd, "MMM d")}
          </Text>
        )}
      </View>

      <Pressable
        className="mx-4 mb-4 rounded-card bg-accent px-6 py-4 active:opacity-60"
        onPress={() => logPeriodToday()}
      >
        <Text className="text-center text-lg font-semibold text-white">
          Log Period Today
        </Text>
      </Pressable>

      <View className="mx-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-4 text-sm font-medium text-[var(--text-muted)]">TODAY</Text>
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
              {todayLog.mood && (
                <Text className="text-sm text-[var(--text-muted)]">{todayLog.mood}</Text>
              )}
            </View>
          </>
        ) : (
          <Text className="text-sm text-[var(--text-muted)]">
            Nothing logged yet today
          </Text>
        )}
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-4 text-sm font-medium text-[var(--text-muted)]">
          THIS WEEK
        </Text>
        <WeekStrip days={weekDays} />
      </View>

      <View
        className="mx-4 mt-4 mb-8 rounded-card px-5 py-4"
        style={{ backgroundColor: `${phaseTextColor}1f` }}
      >
        <Text className="text-sm font-medium" style={{ color: phaseTextColor }}>
          {PHASE_TIPS[phase]}
        </Text>
      </View>
    </ScrollView>
  )
}
