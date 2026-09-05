import { View, Pressable } from "react-native"
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
import { IconButton } from "@/components/ui/icon-button"
import { AppText } from "@/components/ui/text"
import { useDateLocale } from "@/hooks/use-date-locale"
import type { CycleDayState } from "@/hooks/use-cycle-day-states"

interface MonthGridProps {
  currentMonth: Date
  onMonthChange: (month: Date) => void
  dayStates: Map<string, CycleDayState>
  onDayPress: (date: Date) => void
  discreet?: boolean
}

interface DayCellProps {
  date: Date
  state: CycleDayState
  today: boolean
  inMonth: boolean
  dark: boolean
  onPress: (date: Date) => void
}

const DayCell = memo(function DayCell({
  date,
  state,
  today,
  inMonth,
  dark,
  onPress,
}: DayCellProps) {
  const locale = useDateLocale()
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
  const stateParts = [
    state.period ? t("calendar.statePeriod") : null,
    state.predicted ? t("calendar.statePredicted") : null,
    state.uncertain && !state.predicted ? t("calendar.statePossible") : null,
    state.ovulation ? t("calendar.stateOvulation") : null,
    state.fertile > 0 ? t("calendar.stateFertile") : null,
    state.logged ? t("calendar.stateLogged") : null,
  ].filter(Boolean)

  const accessibilityLabel = [
    format(date, "PPPP", { locale }),
    today ? t("calendar.today") : null,
    ...stateParts,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <Pressable
      onPress={() => onPress(date)}
      className="min-h-16 flex-1 items-center justify-center gap-1 py-2 active:opacity-60"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View
        className={cn(
          "min-w-8 items-center rounded-pill border px-1",
          today ? "border-[var(--accent)]" : "border-transparent",
        )}
      >
        <AppText
          variant="label"
          tone={inMonth ? "primary" : "muted"}
          className="text-center"
        >
          {format(date, "d")}
        </AppText>
      </View>
      <View
        className="h-4 items-center justify-center"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {marked ? (
          <DayCircle
            size={14}
            fill={fill}
            colors={style.colors}
            opacity={style.opacity}
          />
        ) : state.logged ? (
          <View className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
        ) : null}
      </View>
    </Pressable>
  )
})

export function MonthGrid({
  currentMonth,
  onMonthChange,
  dayStates,
  onDayPress,
  discreet = false,
}: MonthGridProps) {
  const locale = useDateLocale()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"
  const { muted } = useThemeColors()
  const { t } = useTranslation()
  // Memoized on the month so DayCell props keep stable identities and the
  // cell memoization actually engages.
  const days = useMemo(() => getDaysInMonthGrid(currentMonth), [currentMonth])
  const weeks = useMemo(
    () =>
      Array.from({ length: days.length / 7 }, (_, row) =>
        days.slice(row * 7, row * 7 + 7),
      ),
    [days],
  )

  const prevMonth = () => onMonthChange(subMonths(currentMonth, 1))
  const nextMonth = () => onMonthChange(addMonths(currentMonth, 1))
  const isOffCurrentMonth = !isSameMonth(currentMonth, new Date())
  const goToday = () => onMonthChange(startOfMonth(new Date()))

  // The grid starts on Sunday irrespective of the locale's week-start preference.
  const weekDays = Array.from({ length: 7 }, (_, day) =>
    format(new Date(2026, 0, 4 + day), "EEEEE", { locale }),
  )

  return (
    <View>
      <View className="flex-row items-center justify-between gap-2 pb-3">
        <IconButton onPress={prevMonth} accessibilityLabel={t("calendar.prevMonth")}>
          <ChevronLeft size={20} color={muted} />
        </IconButton>
        <View className="flex-1 items-center justify-center gap-2">
          <AppText variant="section" accessibilityRole="header" className="text-center">
            {format(currentMonth, "MMMM yyyy", { locale })}
          </AppText>
          {isOffCurrentMonth ? (
            <Button
              variant="muted"
              size="sm"
              onPress={goToday}
              accessibilityLabel={t("calendar.today")}
            >
              {t("calendar.today")}
            </Button>
          ) : null}
        </View>
        <IconButton onPress={nextMonth} accessibilityLabel={t("calendar.nextMonth")}>
          <ChevronRight size={20} color={muted} />
        </IconButton>
      </View>

      <View className="-mx-screen">
        <View className="flex-row">
          {weekDays.map((day, index) => (
            <View key={index} className="flex-1 items-center py-2">
              <AppText variant="supporting" tone="muted">
                {day}
              </AppText>
            </View>
          ))}
        </View>

        {weeks.map((week) => (
          <View key={format(week[0].date, "yyyy-MM-dd")} className="flex-row">
            {week.map((day) => {
              const iso = format(day.date, "yyyy-MM-dd")
              return (
                <DayCell
                  key={iso}
                  date={day.date}
                  state={discreet ? EMPTY_STATE : (dayStates.get(iso) ?? EMPTY_STATE)}
                  today={isToday(day.date)}
                  inMonth={isSameMonth(day.date, currentMonth)}
                  dark={dark}
                  onPress={onDayPress}
                />
              )
            })}
          </View>
        ))}
      </View>

      {!discreet ? (
        <View className="flex-row flex-wrap gap-4 py-4">
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
      ) : null}
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
    <View className="max-w-full flex-row items-center gap-2">
      <DayCircle size={14} fill={fill} colors={colors} opacity={opacity} />
      <AppText variant="supporting" tone="muted" className="shrink">
        {label}
      </AppText>
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
