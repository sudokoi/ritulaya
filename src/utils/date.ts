import {
  format,
  parseISO,
  differenceInDays,
  addDays,
  subDays,
  isAfter,
  isBefore,
  isEqual,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns"

export {
  format,
  parseISO,
  differenceInDays,
  addDays,
  subDays,
  isAfter,
  isBefore,
  isEqual,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function toISODateTime(date: Date): string {
  return date.toISOString()
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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
