import { setup, assign, fromPromise } from "xstate"
import { eq, desc } from "drizzle-orm"
import { getDatabase } from "@/services/database"
import { cycles as cyclesTable } from "@/db/schema"
import { nowISO, generateId } from "@/utils/date"
import type { Cycle, CycleCreate, CycleUpdate } from "@/types/cycle"

interface CycleMachineContext {
  cycles: Cycle[]
  currentCycle: Cycle | null
  error: string | null
}

export type CycleMachineEvent =
  | { type: "load" }
  | { type: "create"; data: CycleCreate }
  | { type: "update"; id: string; data: CycleUpdate }
  | { type: "delete"; id: string }
  | { type: "endCurrent"; endDate: string }

const loadCycles = fromPromise(async () => {
  const db = getDatabase()
  const all = db.select().from(cyclesTable).orderBy(desc(cyclesTable.startDate)).all()
  const current = all.find((c) => c.endDate === null) ?? null
  return { cycles: all as Cycle[], currentCycle: current }
})

const createCycleFn = fromPromise(async ({ input }: { input: CycleCreate }) => {
  const db = getDatabase()
  const now = nowISO()
  const id = generateId()
  const cycle: Cycle = {
    id,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    createdAt: now,
    updatedAt: now,
  }
  db.insert(cyclesTable).values(cycle).run()
  return cycle
})

const updateCycleFn = fromPromise(
  async ({ input }: { input: { id: string; data: CycleUpdate } }) => {
    const db = getDatabase()
    const now = nowISO()
    db.update(cyclesTable)
      .set({ ...input.data, updatedAt: now })
      .where(eq(cyclesTable.id, input.id))
      .run()
    return { id: input.id, updates: { ...input.data, updatedAt: now } }
  },
)

const deleteCycleFn = fromPromise(async ({ input }: { input: { id: string } }) => {
  const db = getDatabase()
  db.delete(cyclesTable).where(eq(cyclesTable.id, input.id)).run()
  return input.id
})

const endCurrentCycleFn = fromPromise(
  async ({ input }: { input: { cycleId: string; endDate: string } }) => {
    const db = getDatabase()
    const now = nowISO()
    db.update(cyclesTable)
      .set({ endDate: input.endDate, updatedAt: now })
      .where(eq(cyclesTable.id, input.cycleId))
      .run()
    return input.endDate
  },
)

export const cycleMachine = setup({
  types: {
    context: {} as CycleMachineContext,
    events: {} as CycleMachineEvent,
  },
  actors: {
    loadCycles,
    createCycle: createCycleFn,
    updateCycle: updateCycleFn,
    deleteCycle: deleteCycleFn,
    endCurrentCycle: endCurrentCycleFn,
  },
  actions: {
    setError: assign({
      error: (_, error: unknown) =>
        error instanceof Error ? error.message : "An error occurred",
    }),
    clearError: assign({ error: null }),
  },
}).createMachine({
  id: "cycles",
  initial: "idle",
  context: {
    cycles: [],
    currentCycle: null,
    error: null,
  },
  states: {
    idle: {
      on: {
        load: "loading",
        create: "creating",
        update: "updating",
        delete: "deleting",
        endCurrent: "ending",
      },
    },
    loading: {
      invoke: {
        src: "loadCycles",
        onDone: {
          target: "loaded",
          actions: assign(({ event }) => ({
            cycles: event.output.cycles,
            currentCycle: event.output.currentCycle,
            error: null,
          })),
        },
        onError: {
          target: "idle",
          actions: "setError",
        },
      },
    },
    loaded: {
      on: {
        load: "loading",
        create: "creating",
        update: "updating",
        delete: "deleting",
        endCurrent: "ending",
      },
    },
    creating: {
      invoke: {
        src: "createCycle",
        input: ({ event }) => (event.type === "create" ? event.data : { startDate: "" }),
        onDone: {
          target: "loaded",
          actions: assign(({ context, event }) => ({
            cycles: [event.output, ...context.cycles],
            currentCycle:
              event.output.endDate === null ? event.output : context.currentCycle,
            error: null,
          })),
        },
        onError: {
          target: "loaded",
          actions: "setError",
        },
      },
    },
    updating: {
      invoke: {
        src: "updateCycle",
        input: ({ event }) =>
          event.type === "update"
            ? { id: event.id, data: event.data }
            : { id: "", data: {} },
        onDone: {
          target: "loaded",
          actions: assign(({ context, event }) => ({
            cycles: context.cycles.map((c) =>
              c.id === event.output.id ? { ...c, ...event.output.updates } : c,
            ),
            currentCycle:
              context.currentCycle?.id === event.output.id
                ? {
                    ...context.currentCycle,
                    ...event.output.updates,
                  }
                : context.currentCycle,
            error: null,
          })),
        },
        onError: {
          target: "loaded",
          actions: "setError",
        },
      },
    },
    deleting: {
      invoke: {
        src: "deleteCycle",
        input: ({ event }) => (event.type === "delete" ? { id: event.id } : { id: "" }),
        onDone: {
          target: "loaded",
          actions: assign(({ context, event }) => ({
            cycles: context.cycles.filter((c) => c.id !== event.output),
            currentCycle:
              context.currentCycle?.id === event.output ? null : context.currentCycle,
            error: null,
          })),
        },
        onError: {
          target: "loaded",
          actions: "setError",
        },
      },
    },
    ending: {
      invoke: {
        src: "endCurrentCycle",
        input: ({ context, event }) =>
          event.type === "endCurrent"
            ? {
                cycleId: context.currentCycle?.id ?? "",
                endDate: event.endDate,
              }
            : { cycleId: "", endDate: "" },
        onDone: {
          target: "loaded",
          actions: assign(({ context, event }) => ({
            cycles: context.cycles.map((c) =>
              c.id === context.currentCycle?.id
                ? { ...c, endDate: event.output, updatedAt: nowISO() }
                : c,
            ),
            currentCycle: null,
            error: null,
          })),
        },
        onError: {
          target: "loaded",
          actions: "setError",
        },
      },
    },
  },
})
