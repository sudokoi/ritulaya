import { useSelector } from "@xstate/store-react"
import { cycleStore, loadCycles } from "@/stores/cycle-store"

export function useCycles() {
  const cycles = useSelector(cycleStore, (s) => s.context.cycles)
  const currentCycle = useSelector(cycleStore, (s) => s.context.currentCycle)
  const loaded = useSelector(cycleStore, (s) => s.context.loaded)

  return {
    cycles,
    currentCycle,
    isLoaded: loaded,
    load: loadCycles,
  }
}
