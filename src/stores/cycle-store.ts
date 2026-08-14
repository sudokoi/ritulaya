import { createStore } from "@xstate/store"
import { listCycles, findCurrentCycle, createCycle, endCycle } from "@/db/cycles"
import { findLastFlowDate } from "@/db/day-logs"
import { upsertDayLog } from "@/stores/day-log-store"
import { todayISO } from "@/utils/date"
import { addDays, differenceInDays, format } from "date-fns"
import type { Cycle } from "@/types/cycle"
import type { FlowIntensity } from "@/types/day-log"

const DEFAULT_PERIOD_DAYS = 3
const NEW_CYCLE_GAP_DAYS = 7

interface CycleState {
  cycles: Cycle[]
  currentCycle: Cycle | null
  loaded: boolean
}

export const cycleStore = createStore({
  context: {
    cycles: [] as Cycle[],
    currentCycle: null as Cycle | null,
    loaded: false,
  } as CycleState,
  on: {
    setCycles: (ctx, event: { cycles: Cycle[]; currentCycle: Cycle | null }) => ({
      ...ctx,
      cycles: event.cycles,
      currentCycle: event.currentCycle,
      loaded: true,
    }),
  },
})

export function loadCycles() {
  const cycles = listCycles()
  const currentCycle = findCurrentCycle()
  cycleStore.send({ type: "setCycles", cycles, currentCycle })
}

export async function logPeriodToday(flow: FlowIntensity = "medium") {
  const today = todayISO()
  let cycle = findCurrentCycle()

  if (cycle) {
    const lastFlowDate = findLastFlowDate()
    if (
      lastFlowDate &&
      differenceInDays(new Date(today), new Date(lastFlowDate)) >= NEW_CYCLE_GAP_DAYS
    ) {
      endCycle(cycle.id, format(addDays(new Date(today), -1), "yyyy-MM-dd"))
      cycle = createCycle(today)
    }
  } else {
    cycle = createCycle(today)
  }

  for (let i = 0; i < DEFAULT_PERIOD_DAYS; i++) {
    await upsertDayLog({
      date: format(addDays(new Date(today), i), "yyyy-MM-dd"),
      cycleId: cycle.id,
      flowIntensity: flow,
      symptoms: [],
      mood: null,
    })
  }

  loadCycles()
}
