import { View, Text } from "react-native"
import { useColorScheme } from "nativewind"
import { DayCircle } from "@/components/day-circle"
import { resolveDayStyle } from "@/lib/day-colors"

interface WeekDay {
  date: Date
  label: string
  isPeriod: boolean
  isPredicted: boolean
  fertile: number
  isOvulation: boolean
  isToday: boolean
}

interface WeekStripProps {
  days: WeekDay[]
}

export function WeekStrip({ days }: WeekStripProps) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"

  return (
    <View className="flex-row justify-between px-2">
      {days.map((day, i) => {
        const style = resolveDayStyle({
          isPeriod: day.isPeriod,
          isPredicted: day.isPredicted,
          isOvulation: day.isOvulation,
          fertile: day.fertile,
          dark,
        })
        const marked = style.fill > 0

        return (
          <View key={i} className="relative flex-1 items-center gap-1">
            <Text className="text-xs text-[var(--text-muted)]">{day.label}</Text>
            {marked ? (
              <DayCircle
                size={20}
                fill={style.fill}
                colors={style.colors}
                opacity={style.opacity}
              />
            ) : (
              <View className="h-5 w-5 rounded-full bg-[var(--bg-muted)]" />
            )}
            {day.isToday && (
              <View className="absolute -bottom-1 h-0.5 w-3 rounded-full bg-[var(--text-primary)]" />
            )}
          </View>
        )
      })}
    </View>
  )
}
