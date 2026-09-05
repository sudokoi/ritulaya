import { createStore } from "@xstate/store"
import { listCycles } from "@/services/db"
import { logger } from "@/services/logger"
import type { Cycle } from "@/types/cycle"

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
  try {
    const cycles = await listCycles()
    const currentCycle = cycles.find((cycle) => cycle.endDate === null) ?? null
    cycleStore.send({ type: "setCycles", cycles, currentCycle })
  } catch (e) {
    logger.error("db:cycles", "Failed to load cycles", e)
    throw e
  }
}
