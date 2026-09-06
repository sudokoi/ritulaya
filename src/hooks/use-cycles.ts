import { useSelector } from "@xstate/store-react"
import { dataStore } from "@/stores/data-store"
import { refreshAll } from "@/data/refresh"

export function useCycles() {
  const cycles = useSelector(dataStore, (s) => s.context.cycles)
  const currentCycle = useSelector(dataStore, (s) => s.context.currentCycle)
  const loaded = useSelector(dataStore, (s) => s.context.loaded)

  return {
    cycles,
    currentCycle,
    isLoaded: loaded,
    load: refreshAll,
  }
}
