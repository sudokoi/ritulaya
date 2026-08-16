import { View, Text, Pressable } from "react-native"
import { addMonths, subMonths, format, isSameMonth, isToday } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useMemo } from "react"
import { getDaysInMonthGrid } from "@/utils/date"
import { cn } from "@/lib/utils"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { DayCircle } from "@/components/day-circle"
import { dayGradient, resolveDayStyle } from "@/lib/day-colors"
import { fertileFractions } from "@/lib/cycle-derivation"
import type { FertileDay } from "@/lib/cycle-derivation"

interface CalendarDay {
  date: Date
  period: boolean
  predictedPeriod: boolean
  fertile: number
  ovulation: boolean
  logged: boolean
}

function getDayType(
  date: Date,
  periodDays: string[],
  predictedDays: string[],
  fertileMap: Map<string, number>,
  ovulationDays: string[],
  loggedDays: string[],
): CalendarDay {
  const iso = format(date, "yyyy-MM-dd")
  return {
    date,
    period: periodDays.includes(iso),
    predictedPeriod: predictedDays.includes(iso),
    fertile: fertileMap.get(iso) ?? 0,
    ovulation: ovulationDays.includes(iso),
    logged: loggedDays.includes(iso),
  }
}

interface MonthGridProps {
  currentMonth: Date
  onMonthChange: (month: Date) => void
  periodDays: string[]
  predictedDays: string[]
  fertileDays: FertileDay[]
  ovulationDays: string[]
  loggedDays: string[]
  onDayPress: (date: Date) => void
}

export function MonthGrid({
  currentMonth,
  onMonthChange,
  periodDays,
  predictedDays,
  fertileDays,
  ovulationDays,
  loggedDays,
  onDayPress,
}: MonthGridProps) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"
  const { muted } = useThemeColors()
  const days = getDaysInMonthGrid(currentMonth)
  const fertileMap = useMemo(() => fertileFractions(fertileDays), [fertileDays])

  const prevMonth = () => onMonthChange(subMonths(currentMonth, 1))
  const nextMonth = () => onMonthChange(addMonths(currentMonth, 1))

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
            fertileMap,
            ovulationDays,
            loggedDays,
          )
          const today = isToday(day.date)
          const inMonth = isSameMonth(day.date, currentMonth)
          const marked =
            info.period || info.predictedPeriod || info.ovulation || info.fertile > 0

          const style = resolveDayStyle({
            isPeriod: info.period,
            isPredicted: info.predictedPeriod,
            isOvulation: info.ovulation,
            fertile: info.fertile,
            dark,
          })
          const textClass = info.period
            ? "text-white"
            : info.predictedPeriod
              ? "text-menstrual dark:text-menstrual-dark"
              : "text-[var(--text-primary)]"

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
                  <DayCircle
                    size={34}
                    fill={style.fill}
                    colors={style.colors}
                    opacity={style.opacity}
                  >
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        textClass,
                        !inMonth && "opacity-30",
                      )}
                    >
                      {format(day.date, "d")}
                    </Text>
                  </DayCircle>
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
                  {info.logged && (
                    <View className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[var(--text-muted)]" />
                  )}
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      <View className="flex-row justify-center gap-4 px-4 py-3">
        <Legend colors={dayGradient("menstrual", dark)} fill={1} label="Period" />
        <Legend
          colors={dayGradient("menstrual", dark)}
          fill={1}
          opacity={0.45}
          label="Predicted"
        />
        <Legend colors={dayGradient("ovulation", dark)} fill={0.6} label="Fertile" />
        <Legend colors={dayGradient("ovulation", dark)} fill={1} label="Ovulation" />
      </View>
    </View>
  )
}

function Legend({
  colors,
  fill,
  opacity = 1,
  label,
}: {
  colors: [string, string]
  fill: number
  opacity?: number
  label: string
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <DayCircle size={14} fill={fill} colors={colors} opacity={opacity} />
      <Text className="text-xs text-[var(--text-muted)]">{label}</Text>
    </View>
  )
}
