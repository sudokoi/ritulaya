import { useSelector } from "@xstate/react"
import { useStoreActors } from "@/providers/store-provider"
import type { CycleCreate, CycleUpdate } from "@/types/cycle"

export function useCycleActor() {
  const { cycleActor } = useStoreActors()

  const cycles = useSelector(cycleActor, (s) => s.context.cycles)
  const currentCycle = useSelector(cycleActor, (s) => s.context.currentCycle)
  const error = useSelector(cycleActor, (s) => s.context.error)
  const isLoaded = useSelector(cycleActor, (s) => s.matches("loaded"))

  return {
    cycles,
    currentCycle,
    error,
    isLoaded,
    load: () => cycleActor.send({ type: "load" }),
    create: (data: CycleCreate) => cycleActor.send({ type: "create", data }),
    update: (id: string, data: CycleUpdate) =>
      cycleActor.send({ type: "update", id, data }),
    deleteCycle: (id: string) => cycleActor.send({ type: "delete", id }),
    endCurrent: (endDate: string) => cycleActor.send({ type: "endCurrent", endDate }),
  }
}
