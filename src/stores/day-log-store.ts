import { createStore } from "@xstate/store"
import { listDayLogs } from "@/services/db"
import { logger } from "@/services/logger"
import { todayISO } from "@/utils/date"
import type { DayLog } from "@/types/day-log"

interface DayLogState {
  logs: DayLog[]
  todayLog: DayLog | null
  loaded: boolean
}

export const dayLogStore = createStore({
  context: {
    logs: [] as DayLog[],
    todayLog: null as DayLog | null,
    loaded: false,
  } as DayLogState,
  on: {
    setLogs: (ctx, event: { logs: DayLog[] }) => ({
      ...ctx,
      logs: event.logs,
      todayLog: event.logs.find((l) => l.date === todayISO()) ?? null,
      loaded: true,
    }),
  },
})

export async function loadDayLogs() {
  try {
    const logs = await listDayLogs()
    dayLogStore.send({ type: "setLogs", logs })
  } catch (e) {
    logger.error("db:day-logs", "Failed to load day logs", e)
    throw e
  }
}
