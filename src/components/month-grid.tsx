import { View, Text, Pressable } from "react-native"
import {
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { memo, useMemo } from "react"
import { getDaysInMonthGrid } from "@/utils/date"
import { cn } from "@/lib/utils"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { useTranslation } from "react-i18next"
import { DayCircle } from "@/components/day-circle"
import { dayGradient, resolveDayStyle } from "@/lib/day-colors"
import { Button } from "@/components/ui/button"
import type { CycleDayState } from "@/hooks/use-cycle-day-states"

interface MonthGridProps {
  currentMonth: Date
  onMonthChange: (month: Date) => void
  dayStates: Map<string, CycleDayState>
  onDayPress: (date: Date) => void
}

interface DayCellProps {
  date: Date
  state: CycleDayState
  today: boolean
  inMonth: boolean
  dark: boolean
  onPress: (date: Date) => void
}

const CELL_MARKED_STYLE = { width: 40, height: 40, borderRadius: 20 }
const CELL_PLAIN_STYLE = { width: 34, height: 34, borderRadius: 17 }

const DayCell = memo(function DayCell({
  date,
  state,
  today,
  inMonth,
  dark,
  onPress,
}: DayCellProps) {
  const { t } = useTranslation()
  const marked =
    state.period ||
    state.predicted ||
    state.uncertain ||
    state.ovulation ||
    state.fertile > 0

  // Uncertain days borrow the predicted gradient at a whisper so the calendar
  // communicates "could start here" without competing with the point estimate.
  const style = resolveDayStyle({
    isPeriod: state.period,
    isPredicted: state.predicted || state.uncertain,
    isOvulation: state.ovulation,
    fertile: state.fertile,
    dark,
  })
  const fill = state.uncertain && !state.predicted ? style.fill * 0.45 : style.fill
  const textClass = state.period
    ? "text-white"
    : state.predicted
      ? "text-menstrual dark:text-menstrual-dark"
      : "text-[var(--text-primary)]"

  const stateParts = [
    state.period ? t("calendar.statePeriod") : null,
    state.predicted ? t("calendar.statePredicted") : null,
    state.uncertain && !state.predicted ? t("calendar.statePossible") : null,
    state.ovulation ? t("calendar.stateOvulation") : null,
    state.fertile > 0 ? t("calendar.stateFertile") : null,
    state.logged ? t("calendar.stateLogged") : null,
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
          <DayCircle size={34} fill={fill} colors={style.colors} opacity={style.opacity}>
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
          {state.logged ? (
            <View className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[var(--text-muted)]" />
          ) : null}
        </View>
      )}
    </Pressable>
  )
})

export function MonthGrid({
  currentMonth,
  onMonthChange,
  dayStates,
  onDayPress,
}: MonthGridProps) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"
  const { muted } = useThemeColors()
  const { t } = useTranslation()
  // Memoized on the month so DayCell props keep stable identities and the
  // cell memoization actually engages.
  const days = useMemo(() => getDaysInMonthGrid(currentMonth), [currentMonth])

  const prevMonth = () => onMonthChange(subMonths(currentMonth, 1))
  const nextMonth = () => onMonthChange(addMonths(currentMonth, 1))
  const isOffCurrentMonth = !isSameMonth(currentMonth, new Date())
  const goToday = () => onMonthChange(startOfMonth(new Date()))

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <View>
      <View className="flex-row items-center justify-between px-4 py-4">
        <Pressable
          onPress={prevMonth}
          className="active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("calendar.prevMonth")}
        >
          <ChevronLeft size={20} color={muted} />
        </Pressable>
        <View className="flex-1 items-center justify-center gap-1 min-h-[68px]">
          <Text className="text-lg font-semibold text-[var(--text-primary)]">
            {format(currentMonth, "MMMM yyyy")}
          </Text>
          <View className="min-h-[36px] justify-center">
            {isOffCurrentMonth ? (
              <Button
                variant="muted"
                size="sm"
                onPress={goToday}
                accessibilityLabel={t("calendar.today")}
                className="px-4 py-1.5"
                textClassName="text-xs"
              >
                {t("calendar.today")}
              </Button>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={nextMonth}
          className="active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("calendar.nextMonth")}
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
        {days.map((day) => {
          const iso = format(day.date, "yyyy-MM-dd")
          return (
            <DayCell
              key={iso}
              date={day.date}
              state={dayStates.get(iso) ?? EMPTY_STATE}
              today={isToday(day.date)}
              inMonth={isSameMonth(day.date, currentMonth)}
              dark={dark}
              onPress={onDayPress}
            />
          )
        })}
      </View>

      <View className="flex-row justify-center gap-3 px-4 py-3">
        <Legend
          colors={dayGradient("menstrual", dark)}
          fill={1}
          label={t("calendar.legendPeriod")}
        />
        <Legend
          colors={dayGradient("menstrual", dark)}
          fill={1}
          opacity={0.45}
          label={t("calendar.legendPredicted")}
        />
        <Legend
          colors={dayGradient("menstrual", dark)}
          fill={0.45}
          opacity={0.45}
          label={t("calendar.legendMaybe")}
        />
        <Legend
          colors={dayGradient("ovulation", dark)}
          fill={0.6}
          label={t("calendar.legendFertile")}
        />
        <Legend
          colors={dayGradient("ovulation", dark)}
          fill={1}
          label={t("calendar.legendOvulation")}
        />
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

const EMPTY_STATE: CycleDayState = {
  period: false,
  predicted: false,
  uncertain: false,
  fertile: 0,
  ovulation: false,
  logged: false,
}
