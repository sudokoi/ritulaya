import { createStore } from "@xstate/store"
import { listCycles, findCurrentCycle, createCycle } from "@/db/cycles"
import { upsertDayLog } from "@/stores/day-log-store"
import { todayISO } from "@/utils/date"
import type { Cycle } from "@/types/cycle"
import type { FlowIntensity } from "@/types/day-log"

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
  let cycle = findCurrentCycle()
  if (!cycle) cycle = createCycle(todayISO())

  await upsertDayLog({
    date: todayISO(),
    cycleId: cycle.id,
    flowIntensity: flow,
    symptoms: [],
    mood: null,
  })

  loadCycles()
}
