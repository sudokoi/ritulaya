import { View, Text } from "react-native"
import { cn } from "@/lib/utils"

interface WeekDay {
  date: Date
  label: string
  isPeriod: boolean
  isPredicted: boolean
  isFertile: boolean
  isToday: boolean
}

interface WeekStripProps {
  days: WeekDay[]
}

export function WeekStrip({ days }: WeekStripProps) {
  return (
    <View className="flex-row justify-between px-2">
      {days.map((day, i) => (
        <View key={i} className="flex-1 items-center gap-1">
          <Text className="text-xs text-[var(--text-muted)]">{day.label}</Text>
          <View
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              day.isPeriod && "bg-menstrual",
              day.isPredicted && "border-2 border-menstrual",
              !day.isPeriod && !day.isPredicted && "bg-[var(--border-light)]",
            )}
          />
          {day.isToday && (
            <View className="absolute -bottom-1 h-0.5 w-3 rounded-full bg-[var(--text-primary)]" />
          )}
        </View>
      ))}
    </View>
  )
}
