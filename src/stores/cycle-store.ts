import { createStore } from "@xstate/store"
import { listCycles, createCycle, endCycle, findLastFlowDate } from "@/services/db"
import { upsertDayLog } from "@/stores/day-log-store"
import { todayISO } from "@/utils/date"
import { addDays, differenceInDays, format } from "date-fns"
import type { Cycle } from "@/types/cycle"
import type { FlowIntensity } from "@/types/day-log"

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

export async function loadCycles() {
  const cycles = await listCycles()
  const currentCycle = cycles.find((cycle) => cycle.endDate === null) ?? null
  cycleStore.send({ type: "setCycles", cycles, currentCycle })
}

export async function logPeriodToday(flow: FlowIntensity = "medium", periodDays = 3) {
  const today = todayISO()
  const cycles = await listCycles()
  let cycle = cycles.find((c) => c.endDate === null) ?? null

  if (cycle) {
    const lastFlowDate = await findLastFlowDate()
    if (
      lastFlowDate &&
      differenceInDays(new Date(today), new Date(lastFlowDate)) >= NEW_CYCLE_GAP_DAYS
    ) {
      await endCycle(cycle.id, format(addDays(new Date(today), -1), "yyyy-MM-dd"))
      cycle = await createCycle(today)
    }
  } else {
    cycle = await createCycle(today)
  }

  if (!cycle) return

  for (let i = 0; i < periodDays; i++) {
    await upsertDayLog({
      date: format(addDays(new Date(today), i), "yyyy-MM-dd"),
      cycleId: cycle.id,
      flowIntensity: flow,
      symptoms: [],
      mood: null,
    })
  }

  await loadCycles()
}
