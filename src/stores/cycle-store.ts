import { createStore } from "@xstate/store"
import { listCycles, logPeriod } from "@/services/db"
import { loadDayLogs } from "@/stores/day-log-store"
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

export async function loadCycles() {
  const cycles = await listCycles()
  const currentCycle = cycles.find((cycle) => cycle.endDate === null) ?? null
  cycleStore.send({ type: "setCycles", cycles, currentCycle })
}

export async function logPeriodToday(flow: FlowIntensity = "medium", periodDays = 3) {
  await logPeriod(flow, periodDays)
  await loadCycles()
  await loadDayLogs()
}
