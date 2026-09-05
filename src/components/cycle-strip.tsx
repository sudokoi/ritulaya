import { View, Text, Pressable } from "react-native"
import { useMemo } from "react"
import { addDays, format, isToday as isTodayFns } from "date-fns"
import { useColorScheme } from "nativewind"
import { useTranslation } from "react-i18next"
import { DayCircle } from "@/components/day-circle"
import { resolveDayStyle } from "@/lib/day-colors"
import type { CycleDayState } from "@/hooks/use-cycle-day-states"

const EMPTY_STATE: CycleDayState = {
  period: false,
  predicted: false,
  uncertain: false,
  fertile: 0,
  ovulation: false,
  logged: false,
}

export interface CycleStripProps {
  centerDate: Date
  span?: number
  dayStates: Map<string, CycleDayState>
  selectedDate?: Date | null
  onDayPress?: (date: Date) => void
}

export function CycleStrip({
  centerDate,
  span = 7,
  dayStates,
  selectedDate,
  onDayPress,
}: CycleStripProps) {
  const { colorScheme } = useColorScheme()
  const { t } = useTranslation()
  const dark = colorScheme === "dark"
  const selectedIso = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null

  const days = useMemo(() => {
    const half = Math.floor(span / 2)
    return Array.from({ length: span }).map((_, i) => {
      const date = addDays(centerDate, i - half)
      const iso = format(date, "yyyy-MM-dd")
      return {
        date,
        iso,
        label: format(date, "EEEEE"),
        isToday: isTodayFns(date),
        isSelected: iso === selectedIso,
        state: dayStates.get(iso) ?? EMPTY_STATE,
      }
    })
  }, [centerDate, span, dayStates, selectedIso])

  return (
    <View className="flex-row justify-between px-2">
      {days.map((day) => {
        const state = day.state
        const style = resolveDayStyle({
          isPeriod: state.period,
          isPredicted: state.predicted || state.uncertain,
          isOvulation: state.ovulation,
          fertile: state.fertile,
          dark,
        })
        const fill = state.uncertain && !state.predicted ? style.fill * 0.45 : style.fill
        const marked = fill > 0

        const selected = day.isSelected

        const circle = marked ? (
          <View
            className={`rounded-full p-0.5 ${selected ? "border-2 border-[var(--accent)]" : "border-2 border-transparent"}`}
          >
            <DayCircle
              size={20}
              fill={fill}
              colors={style.colors}
              opacity={style.opacity}
            />
          </View>
        ) : (
          <View
            className={`h-6 w-6 items-center justify-center rounded-full ${selected ? "border-2 border-[var(--accent)]" : "border-2 border-transparent"}`}
          >
            <View className="h-5 w-5 rounded-full bg-[var(--bg-muted)]" />
          </View>
        )

        const content = (
          <>
            <Text className="text-xs text-[var(--text-muted)]">{day.label}</Text>
            {circle}
            {day.isToday ? (
              <View className="absolute -bottom-1 h-0.5 w-3 rounded-full bg-[var(--text-primary)]" />
            ) : null}
          </>
        )

        if (onDayPress) {
          return (
            <Pressable
              key={day.iso}
              onPress={() => onDayPress(day.date)}
              className="relative min-h-11 flex-1 items-center gap-1 py-2 active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel={`${format(day.date, "EEE, MMM d")}${day.isToday ? `, ${t("calendar.today")}` : ""}`}
              accessibilityState={{ selected: !!selected }}
            >
              {content}
            </Pressable>
          )
        }

        return (
          <View key={day.iso} className="relative flex-1 items-center gap-1 py-1">
            {content}
          </View>
        )
      })}
    </View>
  )
}
