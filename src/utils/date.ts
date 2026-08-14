import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns"

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function getDaysInMonthGrid(
  date: Date,
): { date: Date; isCurrentMonth: boolean }[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((d) => ({
    date: d,
    isCurrentMonth: d.getMonth() === date.getMonth(),
  }))
}
