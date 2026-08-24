import { View, Text, Pressable } from "react-native"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { symptomLabel, moodLabel } from "@/domain/day-entry-display"
import type { DayLog, FlowIntensity } from "@/types/day-log"

const FLOW_LEVELS: FlowIntensity[] = ["none", "spotting", "light", "medium", "heavy"]

interface TodayCardProps {
  log: DayLog | null
  onFlowSelect?: (level: FlowIntensity) => void
  onOpenEditor?: () => void
}

export function TodayCard({ log, onFlowSelect, onOpenEditor }: TodayCardProps) {
  const { t } = useTranslation()

  return (
    <View className="mx-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-[var(--text-muted)]">
          {t("today.sectionToday")}
        </Text>
        {onOpenEditor ? (
          <Pressable
            onPress={onOpenEditor}
            hitSlop={8}
            className="active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel={t("common.edit")}
          >
            <Text className="text-sm font-medium text-accent">{t("common.edit")}</Text>
          </Pressable>
        ) : null}
      </View>

      {log ? (
        <>
          <View className="mb-3 flex-row justify-center gap-2">
            {FLOW_LEVELS.map((level) => {
              const selected = log.flowIntensity === level
              if (onFlowSelect) {
                return (
                  <Pressable
                    key={level}
                    onPress={() => onFlowSelect(level)}
                    className={cn(
                      "h-8 w-8 rounded-full active:opacity-60",
                      selected ? "bg-accent" : "bg-[var(--bg-muted)]",
                    )}
                    accessibilityRole="button"
                    accessibilityLabel={t("sheet.flowState", {
                      label: t(`flow.${level}`),
                    })}
                    accessibilityState={{ selected }}
                  />
                )
              }
              return (
                <View
                  key={level}
                  className={cn(
                    "h-8 w-8 rounded-full",
                    selected ? "bg-accent" : "bg-[var(--bg-muted)]",
                  )}
                />
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
                      {symptomLabel(symptom, t as unknown as (k: string) => string)}
                    </Text>
                  </View>
                ))
              : null}
            {log.mood ? (
              <View className="rounded-pill bg-[var(--bg-muted)] px-4 py-2">
                <Text className="text-sm text-[var(--text-primary)]">
                  {moodLabel(log.mood, t as unknown as (k: string) => string)}
                </Text>
              </View>
            ) : null}
          </View>

          {log.symptoms.length === 0 && !log.mood ? (
            <Pressable onPress={onOpenEditor} className="mt-2 active:opacity-60">
              <Text className="text-sm text-[var(--text-muted)]">
                {(t as unknown as (k: string) => string)("today.tapToAddDetails")}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Pressable
          onPress={onOpenEditor}
          className="active:opacity-60"
          accessibilityRole={onOpenEditor ? "button" : undefined}
        >
          <Text className="text-sm text-[var(--text-muted)]">
            {t("today.nothingLogged")}
          </Text>
          {onOpenEditor ? (
            <Text className="mt-1 text-sm font-medium text-accent">
              {(t as unknown as (k: string) => string)("today.tapToLog")}
            </Text>
          ) : null}
        </Pressable>
      )}
    </View>
  )
}
