import { View, Text } from "react-native"
import { useTranslation } from "react-i18next"
import { useColorScheme } from "nativewind"
import { symptomLabel, moodLabel } from "@/domain/day-entry-display"
import { DayCircle } from "@/components/day-circle"
import { flowLevelStyle } from "@/lib/day-colors"
import type { DayLog, FlowIntensity } from "@/types/day-log"
import { Button } from "@/components/ui/button"

const FLOW_LEVELS: FlowIntensity[] = ["none", "spotting", "light", "medium", "heavy"]

interface TodayCardProps {
  log: DayLog | null
  onEdit: () => void
}

export function TodayCard({ log, onEdit }: TodayCardProps) {
  const { t } = useTranslation()
  const translate = t as unknown as (k: string) => string
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"

  return (
    <View className="mx-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-[var(--text-muted)]">
          {t("today.sectionToday")}
        </Text>
      </View>

      {log ? (
        <>
          <View className="mb-3 flex-row justify-center gap-2">
            {FLOW_LEVELS.map((level) => {
              const selected = log.flowIntensity === level
              const style = flowLevelStyle(selected ? level : null, dark)
              const isMenstrual = !!style.colors
              return (
                <View
                  key={level}
                  className="h-8 w-8 items-center justify-center"
                  accessibilityRole="image"
                  accessibilityLabel={t("sheet.flowState", {
                    label: t(`flow.${level}`),
                  })}
                >
                  {isMenstrual ? (
                    <DayCircle
                      size={32}
                      fill={style.fill}
                      colors={style.colors}
                      opacity={style.opacity}
                    />
                  ) : (
                    <View className="h-8 w-8 rounded-full bg-[var(--bg-muted)]" />
                  )}
                </View>
              )
            })}
          </View>

          <View className="flex-row flex-wrap gap-2">
            {log.symptoms.length > 0
              ? log.symptoms.map((symptom) => (
                  <View
                    key={symptom}
                    className="rounded-pill bg-[var(--bg-muted)] px-4 py-2"
                  >
                    <Text className="text-sm text-[var(--text-primary)]">
                      {symptomLabel(symptom, translate)}
                    </Text>
                  </View>
                ))
              : null}
            {log.mood ? (
              <View className="rounded-pill bg-[var(--bg-muted)] px-4 py-2">
                <Text className="text-sm text-[var(--text-primary)]">
                  {moodLabel(log.mood, translate)}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <Text className="text-sm text-[var(--text-muted)]">
          {t("today.nothingLogged")}
        </Text>
      )}
      <Button
        onPress={onEdit}
        size="md"
        className="mt-4"
        accessibilityLabel={t(log ? "today.editToday" : "today.logToday")}
      >
        {t(log ? "today.editToday" : "today.logToday")}
      </Button>
    </View>
  )
}
