import { View, Text } from "react-native"
import { useColorScheme } from "nativewind"
import { DayCircle } from "@/components/day-circle"
import { resolveDayStyle } from "@/lib/day-colors"
import type { CycleDayState } from "@/hooks/use-cycle-day-states"

interface WeekStripProps {
  days: { date: Date; label: string; isToday: boolean; state: CycleDayState }[]
}

export function WeekStrip({ days }: WeekStripProps) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"

  return (
    <View className="flex-row justify-between px-2">
      {days.map((day, i) => {
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

        return (
          <View key={i} className="relative flex-1 items-center gap-1">
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
          </View>
        )
      })}
    </View>
  )
}
