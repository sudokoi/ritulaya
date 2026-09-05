import { useSelector } from "@xstate/store-react"
import { dayLogStore, loadDayLogs } from "@/stores/day-log-store"
import type { DayLog } from "@/types/day-log"

export function useDayLogs() {
  const logs = useSelector(dayLogStore, (s) => s.context.logs)
  const todayLog = useSelector(dayLogStore, (s) => s.context.todayLog)
  const loaded = useSelector(dayLogStore, (s) => s.context.loaded)

  return {
    logs,
    todayLog,
    loaded,
    loadDayLogs,
    getLogForDate: (date: string): DayLog | null => {
      return logs.find((l) => l.date === date) ?? null
    },
  }
}
