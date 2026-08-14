import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { useMemo, useEffect } from "react"
import { format, addDays, isToday, differenceInDays } from "date-fns"
import { WeekStrip } from "@/components/week-strip"
import { useCycles } from "@/hooks/use-cycles"
import { useSettingsActor } from "@/hooks/use-settings-actor"
import { usePrediction } from "@/hooks/use-predictions"
import { useNotifications } from "@/hooks/use-notifications"
import { useLogPeriod } from "@/hooks/use-log-period"
import { useDayLogs } from "@/hooks/use-day-logs"
import { cn } from "@/lib/utils"
import { PHASE_COLORS, type Phase } from "@/constants/phase-colors"

function getPhase(daysUntilPeriod: number, avgCycleLength: number): Phase {
  if (daysUntilPeriod <= 5) return "menstrual"
  const dayInCycle = avgCycleLength - daysUntilPeriod
  if (dayInCycle <= 5) return "menstrual"
  if (dayInCycle <= 13) return "follicular"
  if (dayInCycle <= 15) return "ovulation"
  return "luteal"
}

const PHASE_TIPS: Record<Phase, string> = {
  menstrual: "Gentle movement and extra rest help. Be kind to yourself this week.",
  follicular: "Your energy is rising. Great time for new projects and planning.",
  ovulation: "Your energy peaks now. Great time for intense workouts & social plans.",
  luteal: "A good time to wrap things up. Prioritize rest and comfort.",
}

const PHASE_NAMES: Record<Phase, string> = {
  menstrual: "Menstrual Phase",
  follicular: "Follicular Phase",
  ovulation: "Ovulation Phase",
  luteal: "Luteal Phase",
}

export default function TodayScreen() {
  const { currentCycle, isLoaded, load } = useCycles()
  const { avgCycleLength } = useSettingsActor()
  const prediction = usePrediction()
  const today = useMemo(() => new Date(), [])
  useNotifications()

  const { loadDayLogs, todayLog } = useDayLogs()
  const { logPeriodToday } = useLogPeriod()

  useEffect(() => {
    load()
    loadDayLogs()
  }, [load, loadDayLogs])

  const daysUntilPeriod = prediction
    ? differenceInDays(prediction.nextPeriodStart, today)
    : 14

  const phase = getPhase(daysUntilPeriod, avgCycleLength)
  const phaseColor = PHASE_COLORS[phase].hex

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(today, i - 3)
      const iso = format(date, "yyyy-MM-dd")
      return {
        date,
        label: format(date, "EEEEE"),
        isPeriod: false,
        isPredicted: false,
        isFertile: prediction
          ? iso >= format(prediction.fertileWindow.start, "yyyy-MM-dd") &&
            iso <= format(prediction.fertileWindow.end, "yyyy-MM-dd")
          : false,
        isToday: isToday(date),
      }
    })
  }, [prediction, today])

  const cycleDay = currentCycle
    ? differenceInDays(today, new Date(currentCycle.startDate)) + 1
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
          <Text className="text-lg font-medium" style={{ color: phaseColor }}>
            {PHASE_NAMES[phase]}
          </Text>
        </View>
        <View className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-[var(--border-light)]">
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

      <TouchableOpacity
        className="mx-4 mb-4 rounded-card px-6 py-4"
        style={{ backgroundColor: PHASE_COLORS.menstrual.hex }}
        activeOpacity={0.8}
        onPress={() => logPeriodToday()}
      >
        <Text className="text-center text-lg font-semibold text-white">
          Log Period Today
        </Text>
      </TouchableOpacity>

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
                        ? "bg-menstrual"
                        : "bg-[var(--border-light)]",
                    )}
                  />
                ),
              )}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {todayLog.symptoms !== "[]" && JSON.parse(todayLog.symptoms).length > 0
                ? (JSON.parse(todayLog.symptoms) as string[]).map((symptom: string) => (
                    <View
                      key={symptom}
                      className="rounded-pill bg-[var(--border-light)] px-4 py-2"
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
        style={{ backgroundColor: `${phaseColor}15` }}
      >
        <Text className="text-sm font-medium" style={{ color: phaseColor }}>
          {PHASE_TIPS[phase]}
        </Text>
      </View>
    </ScrollView>
  )
}
