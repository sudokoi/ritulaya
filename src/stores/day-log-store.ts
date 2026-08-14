import { createStore } from "@xstate/store"
import {
  listDayLogs,
  upsertDayLog as upsertDayLogInRepo,
  deleteDayLog as deleteDayLogInRepo,
} from "@/db/day-logs"
import { todayISO } from "@/utils/date"
import type { DayLog, DayLogCreate } from "@/types/day-log"

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
    upsertLog: (ctx, event: { log: DayLog }) => {
      const existing = ctx.logs.findIndex((l) => l.id === event.log.id)
      const logs =
        existing >= 0
          ? ctx.logs.map((l) => (l.id === event.log.id ? event.log : l))
          : [event.log, ...ctx.logs]
      return {
        ...ctx,
        logs,
        todayLog: event.log.date === todayISO() ? event.log : ctx.todayLog,
      }
    },
    removeLog: (ctx, event: { id: string }) => {
      const filtered = ctx.logs.filter((l) => l.id !== event.id)
      return {
        ...ctx,
        logs: filtered,
        todayLog:
          ctx.todayLog?.id === event.id
            ? (filtered.find((l) => l.date === todayISO()) ?? null)
            : ctx.todayLog,
      }
    },
  },
})

export async function loadDayLogs() {
  const logs = listDayLogs()
  dayLogStore.send({ type: "setLogs", logs })
}

export async function upsertDayLog(input: DayLogCreate): Promise<DayLog> {
  const log = upsertDayLogInRepo(input)
  dayLogStore.send({ type: "upsertLog", log })
  return log
}

export async function deleteDayLog(id: string) {
  deleteDayLogInRepo(id)
  dayLogStore.send({ type: "removeLog", id })
}
