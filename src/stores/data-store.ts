import { createStore } from "@xstate/store"
import type { Cycle } from "@/types/cycle"
import type { DayLog } from "@/types/day-log"
import type { PredictionBundle } from "@/services/predictions"
import { defaultSettings, type SettingsState } from "@/data/settings"
import { todayISO } from "@/utils/date"

interface DataSnapshot {
  cycles: Cycle[]
  logs: DayLog[]
  settings: SettingsState
  prediction: PredictionBundle
}

export const dataStore = createStore({
  context: {
    cycles: [] as Cycle[],
    logs: [] as DayLog[],
    currentCycle: null as Cycle | null,
    todayLog: null as DayLog | null,
    settings: defaultSettings,
    prediction: {
      prediction: null,
      periodLength: 3,
      avgCycleLength: 28,
      phase: "follicular",
      stats: null,
    } as PredictionBundle,
    loaded: false,
    version: 0,
    refreshFailed: false,
    settingsWrites: 0,
    refreshing: false,
  },
  on: {
    publish: (ctx, event: { snapshot: DataSnapshot }) => ({
      ...ctx,
      ...event.snapshot,
      currentCycle: event.snapshot.cycles.find((cycle) => cycle.endDate === null) ?? null,
      todayLog: event.snapshot.logs.find((log) => log.date === todayISO()) ?? null,
      loaded: true,
      version: ctx.version + 1,
      refreshFailed: false,
    }),
    refreshFailed: (ctx) => ({ ...ctx, refreshFailed: true }),
    beginRefresh: (ctx) => ({ ...ctx, refreshing: true }),
    endRefresh: (ctx) => ({ ...ctx, refreshing: false }),
    beginSettingsWrite: (ctx) => ({ ...ctx, settingsWrites: ctx.settingsWrites + 1 }),
    endSettingsWrite: (ctx) => ({ ...ctx, settingsWrites: ctx.settingsWrites - 1 }),
    settingsError: (ctx, event: { error: string }) => ({
      ...ctx,
      settings: { ...ctx.settings, error: event.error },
    }),
  },
})
