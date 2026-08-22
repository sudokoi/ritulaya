import { View, Text, ScrollView, Pressable } from "react-native"
import { useMemo } from "react"
import { router } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { format, parseISO } from "date-fns"
import { useCycles } from "@/hooks/use-cycles"
import { useDayLogs } from "@/hooks/use-day-logs"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { usePrediction } from "@/hooks/use-predictions"
import { discreetLabel } from "@/lib/discreet"
import {
  completedCycleLengths,
  phaseCorrelations,
  regularityCopy,
} from "@/lib/cycle-insights"
import { phaseNameKey } from "@/lib/phase"
import { useTranslation } from "react-i18next"

function frequency<K extends string>(items: (K | null)[]): [K, number][] {
  const counts = new Map<K, number>()
  for (const item of items) {
    if (!item) continue
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

export default function InsightsScreen() {
  const { t } = useTranslation()
  const { cycles } = useCycles()
  const { logs } = useDayLogs()
  const {
    discreetMode: discreet,
    avgCycleLength,
    avgPeriodLength,
    lutealPhaseLength,
  } = useSettings()
  const { muted } = useThemeColors()
  const { periodLength, stats } = usePrediction()
  const insets = useSafeAreaInsets()

  const symptomFreq = useMemo(() => frequency(logs.flatMap((l) => l.symptoms)), [logs])
  const moodFreq = useMemo(() => frequency(logs.map((l) => l.mood)), [logs])

  const lengthRows = useMemo(() => completedCycleLengths(cycles), [cycles])
  const byPhase = useMemo(
    () =>
      phaseCorrelations(cycles, logs, {
        avgCycleLength,
        avgPeriodLength,
        lutealPhaseLength,
      }),
    [cycles, logs, avgCycleLength, avgPeriodLength, lutealPhaseLength],
  )

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View
        className="flex-row items-center gap-2 px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="p-2 active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <ChevronLeft size={24} color={muted} />
        </Pressable>
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, t("insights.title"), t("discreet.insightsTitle"))}
        </Text>
      </View>

      <View className="mx-4 mt-2 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <View className="flex-row justify-between">
          <Stat value={`${avgCycleLength}`} label={t("calendar.avgCycle")} />
          <Stat value={`${periodLength}`} label={t("calendar.periodDays")} />
          <Stat value={`${cycles.length}`} label={t("insights.cyclesCount")} />
        </View>
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {discreetLabel(
            discreet,
            t("insights.cycleLengths"),
            t("discreet.cycleLengths"),
          )}
        </Text>
        {stats ? (
          <Text className="mb-3 text-sm text-[var(--text-muted)]">
            {(() => {
              const copy = regularityCopy(stats.sigma)
              return t(copy.key, { days: copy.days })
            })()}
          </Text>
        ) : null}
        {lengthRows.length > 0 ? (
          lengthRows.slice(0, 8).map((row) => (
            <View
              key={row.startDate}
              className="flex-row items-center justify-between py-1.5"
            >
              <Text className="text-sm text-[var(--text-primary)]">
                {format(parseISO(row.startDate), "MMM d, yyyy")}
              </Text>
              <View className="flex-row items-center gap-2">
                {stats && Math.abs(row.length - stats.median) <= stats.sigma ? null : (
                  <View className="h-1.5 w-1.5 rounded-full bg-[var(--bg-muted)]" />
                )}
                <Text className="text-sm text-[var(--text-muted)]">
                  {t("insights.lengthDays", { count: row.length })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-sm text-[var(--text-muted)]">
            {discreetLabel(
              discreet,
              t("insights.noCompletedCycles"),
              t("discreet.nothingYet"),
            )}
          </Text>
        )}
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {discreetLabel(discreet, t("insights.byPhase"), t("discreet.byPhase"))}
        </Text>
        {(Object.keys(byPhase) as (keyof typeof byPhase)[])
          .filter(
            (phase) =>
              byPhase[phase].symptoms.length > 0 || byPhase[phase].moods.length > 0,
          )
          .map((phase) => (
            <View key={phase} className="mb-3">
              <Text className="mb-1 text-sm font-medium text-[var(--text-primary)]">
                {t(phaseNameKey(phase))}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {byPhase[phase].symptoms.slice(0, 3).map(([key, count]) => (
                  <View
                    key={key}
                    className="rounded-pill bg-[var(--bg-muted)] px-3 py-1.5"
                  >
                    <Text className="text-xs text-[var(--text-primary)]">
                      {t(`symptoms.${key}`)} · {count}
                    </Text>
                  </View>
                ))}
                {byPhase[phase].moods.slice(0, 2).map(([key, count]) => (
                  <View
                    key={key}
                    className="rounded-pill bg-[var(--bg-muted)] px-3 py-1.5"
                  >
                    <Text className="text-xs text-[var(--text-muted)]">
                      {t(`moods.${key}`)} · {count}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        {Object.values(byPhase).every(
          (p) => p.symptoms.length === 0 && p.moods.length === 0,
        ) ? (
          <Text className="text-sm text-[var(--text-muted)]">
            {discreetLabel(discreet, t("insights.noPatterns"), t("discreet.noPatterns"))}
          </Text>
        ) : null}
      </View>

      <View className="mx-4 mt-4 mb-12 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {discreetLabel(
            discreet,
            t("insights.commonSymptoms"),
            t("discreet.commonSymptoms"),
          )}
        </Text>
        {symptomFreq.length > 0 ? (
          symptomFreq.slice(0, 10).map(([key, count]) => (
            <View key={key} className="flex-row items-center justify-between py-1.5">
              <Text className="text-sm text-[var(--text-primary)]">
                {t(`symptoms.${key}`)}
              </Text>
              <Text className="text-sm text-[var(--text-muted)]">{count}</Text>
            </View>
          ))
        ) : (
          <Text className="text-sm text-[var(--text-muted)]">
            {discreetLabel(discreet, t("insights.noSymptoms"), t("discreet.nothingYet"))}
          </Text>
        )}
      </View>

      <View className="mx-4 mb-12 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {t("insights.commonMoods")}
        </Text>
        {moodFreq.length > 0 ? (
          moodFreq.map(([key, count]) => (
            <View key={key} className="flex-row items-center justify-between py-1.5">
              <Text className="text-sm text-[var(--text-primary)]">
                {t(`moods.${key}`)}
              </Text>
              <Text className="text-sm text-[var(--text-muted)]">{count}</Text>
            </View>
          ))
        ) : (
          <Text className="text-sm text-[var(--text-muted)]">
            {discreetLabel(discreet, t("insights.noMoods"), t("discreet.nothingYet"))}
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-2xl font-bold text-[var(--text-primary)]">{value}</Text>
      <Text className="text-xs text-[var(--text-muted)]">{label}</Text>
    </View>
  )
}
