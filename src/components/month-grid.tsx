import { View, Text, Pressable } from "react-native"
import { addMonths, subMonths, format, isSameMonth, isToday } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { memo, useMemo } from "react"
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

interface DayCellProps {
  date: Date
  info: CalendarDay
  today: boolean
  inMonth: boolean
  dark: boolean
  onPress: (date: Date) => void
}

const DayCell = memo(function DayCell({
  date,
  info,
  today,
  inMonth,
  dark,
  onPress,
}: DayCellProps) {
  const marked = info.period || info.predictedPeriod || info.ovulation || info.fertile > 0

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

  const stateParts = [
    info.period ? "period" : null,
    info.predictedPeriod ? "predicted period" : null,
    info.ovulation ? "ovulation" : null,
    info.fertile > 0 ? "fertile" : null,
    info.logged ? "logged" : null,
  ].filter(Boolean)

  const accessibilityLabel = `${format(date, "MMMM d")}${stateParts.length > 0 ? `, ${stateParts.join(", ")}` : ""}`

  return (
    <Pressable
      onPress={() => onPress(date)}
      className="mb-1 h-11 flex-1 basis-[14.28%] items-center justify-center active:opacity-60"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {marked ? (
        <View
          className={cn(
            "items-center justify-center",
            today && "border-2 border-[var(--text-primary)]",
          )}
          style={CELL_MARKED_STYLE}
        >
          <DayCircle
            size={34}
            fill={style.fill}
            colors={style.colors}
            opacity={style.opacity}
          >
            <Text
              className={cn("text-sm font-medium", textClass, !inMonth && "opacity-30")}
            >
              {format(date, "d")}
            </Text>
          </DayCircle>
        </View>
      ) : (
        <View
          className={cn("items-center justify-center", today && "bg-[var(--bg-muted)]")}
          style={CELL_PLAIN_STYLE}
        >
          <Text
            className={cn(
              "text-sm",
              inMonth
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)] opacity-30",
            )}
          >
            {format(date, "d")}
          </Text>
          {info.logged ? (
            <View className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[var(--text-muted)]" />
          ) : null}
        </View>
      )}
    </Pressable>
  )
})

const CELL_MARKED_STYLE = { width: 40, height: 40, borderRadius: 20 }
const CELL_PLAIN_STYLE = { width: 34, height: 34, borderRadius: 17 }

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

  const periodSet = useMemo(() => new Set(periodDays), [periodDays])
  const predictedSet = useMemo(() => new Set(predictedDays), [predictedDays])
  const ovulationSet = useMemo(() => new Set(ovulationDays), [ovulationDays])
  const loggedSet = useMemo(() => new Set(loggedDays), [loggedDays])

  const cellInfos = useMemo(
    () =>
      days.map((day) => {
        const iso = format(day.date, "yyyy-MM-dd")
        return {
          date: day.date,
          period: periodSet.has(iso),
          predictedPeriod: predictedSet.has(iso),
          fertile: fertileMap.get(iso) ?? 0,
          ovulation: ovulationSet.has(iso),
          logged: loggedSet.has(iso),
        }
      }),
    [days, periodSet, predictedSet, ovulationSet, loggedSet, fertileMap],
  )

  const prevMonth = () => onMonthChange(subMonths(currentMonth, 1))
  const nextMonth = () => onMonthChange(addMonths(currentMonth, 1))

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <View>
      <View className="flex-row items-center justify-between px-4 py-4">
        <Pressable
          onPress={prevMonth}
          className="active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <ChevronLeft size={20} color={muted} />
        </Pressable>
        <Text className="text-lg font-semibold text-[var(--text-primary)]">
          {format(currentMonth, "MMMM yyyy")}
        </Text>
        <Pressable
          onPress={nextMonth}
          className="active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
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
        {days.map((day, i) => (
          <DayCell
            key={i}
            date={day.date}
            info={cellInfos[i]}
            today={isToday(day.date)}
            inMonth={isSameMonth(day.date, currentMonth)}
            dark={dark}
            onPress={onDayPress}
          />
        ))}
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
