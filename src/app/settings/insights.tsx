import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { useMemo } from "react"
import { router } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import { useCycles } from "@/hooks/use-cycles"
import { useDayLogs } from "@/hooks/use-day-logs"
import { useSettings } from "@/hooks/use-settings"
import { usePrediction } from "@/hooks/use-predictions"
import { averageCycleLength } from "@/lib/cycle-derivation"
import { discreetLabel } from "@/lib/discreet"
import { SYMPTOM_CATALOG } from "@/constants/symptoms"
import { MOOD_CATALOG } from "@/constants/moods"

function frequency(items: (string | null)[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (!item) continue
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

export default function InsightsScreen() {
  const { cycles } = useCycles()
  const { logs } = useDayLogs()
  const { avgCycleLength, discreetMode: discreet } = useSettings()
  const { periodLength } = usePrediction()

  const avgLen = useMemo(
    () => averageCycleLength(cycles, avgCycleLength),
    [cycles, avgCycleLength],
  )

  const symptomFreq = useMemo(() => frequency(logs.flatMap((l) => l.symptoms)), [logs])
  const moodFreq = useMemo(() => frequency(logs.map((l) => l.mood)), [logs])

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="flex-row items-center gap-2 px-4 pt-14 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ChevronLeft size={24} color="#8E8C8A" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, "Insights", "Details")}
        </Text>
      </View>

      <View className="mx-4 mt-2 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <View className="flex-row justify-between">
          <Stat value={`${avgLen}`} label={discreetLabel(discreet, "avg cycle", "avg")} />
          <Stat
            value={`${periodLength}`}
            label={discreetLabel(discreet, "period days", "days")}
          />
          <Stat
            value={`${cycles.length}`}
            label={discreetLabel(discreet, "cycles", "total")}
          />
        </View>
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {discreetLabel(discreet, "Common Symptoms", "Common Tags")}
        </Text>
        {symptomFreq.length > 0 ? (
          symptomFreq.slice(0, 10).map(([key, count]) => (
            <View key={key} className="flex-row items-center justify-between py-1.5">
              <Text className="text-sm text-[var(--text-primary)]">
                {SYMPTOM_CATALOG.find((s) => s.key === key)?.label ?? key}
              </Text>
              <Text className="text-sm text-[var(--text-muted)]">{count}</Text>
            </View>
          ))
        ) : (
          <Text className="text-sm text-[var(--text-muted)]">
            {discreetLabel(discreet, "No symptoms logged yet", "Nothing yet")}
          </Text>
        )}
      </View>

      <View className="mx-4 mt-4 mb-12 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Text className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {discreetLabel(discreet, "Common Moods", "Common Moods")}
        </Text>
        {moodFreq.length > 0 ? (
          moodFreq.map(([key, count]) => (
            <View key={key} className="flex-row items-center justify-between py-1.5">
              <Text className="text-sm text-[var(--text-primary)]">
                {MOOD_CATALOG.find((m) => m.key === key)?.label ?? key}
              </Text>
              <Text className="text-sm text-[var(--text-muted)]">{count}</Text>
            </View>
          ))
        ) : (
          <Text className="text-sm text-[var(--text-muted)]">
            {discreetLabel(discreet, "No moods logged yet", "Nothing yet")}
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
