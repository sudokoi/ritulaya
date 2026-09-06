import { useSelector } from "@xstate/store-react"
import { dataStore } from "@/stores/data-store"
import { refreshAll } from "@/data/refresh"
import type { DayLog } from "@/types/day-log"

export function useDayLogs() {
  const logs = useSelector(dataStore, (s) => s.context.logs)
  const todayLog = useSelector(dataStore, (s) => s.context.todayLog)
  const loaded = useSelector(dataStore, (s) => s.context.loaded)

  return {
    logs,
    todayLog,
    loaded,
    loadDayLogs: refreshAll,
    getLogForDate: (date: string): DayLog | null => {
      return logs.find((l) => l.date === date) ?? null
    },
  }
}
