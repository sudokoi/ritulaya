import { View, Text, Pressable } from "react-native"
import { addMonths, subMonths, format, isSameMonth, isToday } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { getDaysInMonthGrid } from "@/utils/date"
import { cn } from "@/lib/utils"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { useState } from "react"

interface CalendarDay {
  date: Date
  period: boolean
  predictedPeriod: boolean
  fertile: boolean
  ovulation: boolean
  loggedSymptoms: boolean
}

function getDayType(
  date: Date,
  periodDays: string[],
  predictedDays: string[],
  fertileDays: string[],
  ovulationDays: string[],
  loggedDays: string[],
): CalendarDay {
  const iso = format(date, "yyyy-MM-dd")
  return {
    date,
    period: periodDays.includes(iso),
    predictedPeriod: predictedDays.includes(iso),
    fertile: fertileDays.includes(iso),
    ovulation: ovulationDays.includes(iso),
    loggedSymptoms: loggedDays.includes(iso),
  }
}

interface MonthGridProps {
  periodDays: string[]
  predictedDays: string[]
  fertileDays: string[]
  ovulationDays: string[]
  loggedDays: string[]
  onDayPress: (date: Date) => void
}

export function MonthGrid({
  periodDays,
  predictedDays,
  fertileDays,
  ovulationDays,
  loggedDays,
  onDayPress,
}: MonthGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { muted } = useThemeColors()
  const days = getDaysInMonthGrid(currentMonth)

  const prevMonth = () => setCurrentMonth((d) => subMonths(d, 1))
  const nextMonth = () => setCurrentMonth((d) => addMonths(d, 1))

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <View>
      <View className="flex-row items-center justify-between px-4 py-4">
        <Pressable onPress={prevMonth} className="p-2 active:opacity-60">
          <ChevronLeft size={20} color={muted} />
        </Pressable>
        <Text className="text-lg font-semibold text-[var(--text-primary)]">
          {format(currentMonth, "MMMM yyyy")}
        </Text>
        <Pressable onPress={nextMonth} className="p-2 active:opacity-60">
          <ChevronRight size={20} color={muted} />
        </Pressable>
      </View>

      <View className="flex-row px-2">
        {weekDays.map((day) => (
          <View key={day} className="flex-1 items-center py-2">
            <Text className="text-xs font-medium text-[var(--text-muted)]">{day}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap px-2">
        {days.map((day, i) => {
          const info = getDayType(
            day.date,
            periodDays,
            predictedDays,
            fertileDays,
            ovulationDays,
            loggedDays,
          )
          const today = isToday(day.date)
          const inMonth = isSameMonth(day.date, currentMonth)
          const marked = info.period || info.predictedPeriod

          return (
            <Pressable
              key={i}
              onPress={() => onDayPress(day.date)}
              className="mb-1 h-11 flex-1 basis-[14.28%] items-center justify-center active:opacity-60"
            >
              {marked ? (
                <View
                  className={cn(
                    "items-center justify-center",
                    today && "border-2 border-[var(--text-primary)]",
                  )}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                >
                  <View
                    className={cn(
                      "items-center justify-center",
                      info.period && "bg-menstrual",
                      !info.period &&
                        info.predictedPeriod &&
                        "border-2 border-menstrual dark:border-menstrual-dark",
                    )}
                    style={{ width: 34, height: 34, borderRadius: 17 }}
                  >
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        info.period
                          ? "text-white"
                          : info.predictedPeriod
                            ? "text-menstrual dark:text-menstrual-dark"
                            : "text-[var(--text-primary)]",
                        !inMonth && "opacity-30",
                      )}
                    >
                      {format(day.date, "d")}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  className={cn(
                    "items-center justify-center",
                    today && "bg-[var(--bg-muted)]",
                  )}
                  style={{ width: 34, height: 34, borderRadius: 17 }}
                >
                  <Text
                    className={cn(
                      "text-sm",
                      inMonth
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)] opacity-30",
                    )}
                  >
                    {format(day.date, "d")}
                  </Text>
                  <View className="absolute bottom-0.5 flex-row gap-0.5">
                    {info.fertile && (
                      <View className="h-1 w-1 rounded-full bg-ovulation" />
                    )}
                    {info.ovulation && (
                      <View className="h-1.5 w-1.5 rounded-full bg-ovulation" />
                    )}
                    {info.loggedSymptoms && !info.period && !info.predictedPeriod && (
                      <View className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
                    )}
                  </View>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      <View className="flex-row justify-center gap-6 px-4 py-3">
        <Legend color="bg-menstrual" label="Period" />
        <Legend
          color="border-2 border-menstrual dark:border-menstrual-dark"
          label="Predicted"
        />
        <Legend color="bg-ovulation" label="Fertile" />
      </View>
    </View>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <Text className="text-xs text-[var(--text-muted)]">{label}</Text>
    </View>
  )
}
