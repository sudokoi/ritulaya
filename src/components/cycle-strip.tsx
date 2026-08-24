import { View, Text, Pressable } from "react-native"
import { useMemo } from "react"
import { addDays, format, isToday as isTodayFns } from "date-fns"
import { useColorScheme } from "nativewind"
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
  onDayPress?: (date: Date) => void
}

export function CycleStrip({
  centerDate,
  span = 7,
  dayStates,
  onDayPress,
}: CycleStripProps) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"

  const days = useMemo(() => {
    const half = Math.floor(span / 2)
    return Array.from({ length: span }).map((_, i) => {
      const date = addDays(centerDate, i - half)
      const iso = format(date, "yyyy-MM-dd")
      return {
        date,
        label: format(date, "EEEEE"),
        isToday: isTodayFns(date),
        state: dayStates.get(iso) ?? EMPTY_STATE,
      }
    })
  }, [centerDate, span, dayStates])

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

        const content = (
          <>
            <Text className="text-xs text-[var(--text-muted)]">{day.label}</Text>
            {marked ? (
              <DayCircle
                size={20}
                fill={fill}
                colors={style.colors}
                opacity={style.opacity}
              />
            ) : (
              <View className="h-5 w-5 rounded-full bg-[var(--bg-muted)]" />
            )}
            {day.isToday ? (
              <View className="absolute -bottom-1 h-0.5 w-3 rounded-full bg-[var(--text-primary)]" />
            ) : null}
          </>
        )

        if (onDayPress) {
          return (
            <Pressable
              key={day.date.toISOString()}
              onPress={() => onDayPress(day.date)}
              className="relative flex-1 items-center gap-1 py-1 active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel={`${format(day.date, "EEE, MMM d")}${day.isToday ? ", today" : ""}`}
            >
              {content}
            </Pressable>
          )
        }

        return (
          <View
            key={day.date.toISOString()}
            className="relative flex-1 items-center gap-1 py-1"
          >
            {content}
          </View>
        )
      })}
    </View>
  )
}
