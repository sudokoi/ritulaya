import { setup, assign, fromPromise } from "xstate"
import { findSettings, insertSettings, updateSettings } from "@/db/settings"
import { nowISO } from "@/utils/date"

interface SettingsContext {
  avgCycleLength: number
  avgPeriodLength: number
  lutealPhaseLength: number
  theme: "light" | "dark" | "system"
  language: string
  biometricLock: boolean
  discreetMode: boolean
  reminderPeriodAhead: number
  reminderDailyLog: boolean
  error: string | null
}

export type SettingsEvent =
  { type: "load" } | { type: "update"; data: Partial<SettingsContext> }

const defaults: SettingsContext = {
  avgCycleLength: 28,
  avgPeriodLength: 5,
  lutealPhaseLength: 14,
  theme: "system",
  language: "en",
  biometricLock: false,
  discreetMode: false,
  reminderPeriodAhead: 2,
  reminderDailyLog: false,
  error: null,
}

const loadSettings = fromPromise(async () => {
  const row = findSettings()

  if (!row) {
    const now = nowISO()
    insertSettings({
      id: "default",
      avgCycleLength: defaults.avgCycleLength,
      avgPeriodLength: defaults.avgPeriodLength,
      lutealPhaseLength: defaults.lutealPhaseLength,
      theme: defaults.theme,
      language: defaults.language,
      biometricLock: 0,
      discreetMode: 0,
      reminderPeriodAhead: defaults.reminderPeriodAhead,
      reminderDailyLog: 0,
      createdAt: now,
      updatedAt: now,
    })
    return defaults
  }

  return {
    avgCycleLength: row.avgCycleLength ?? defaults.avgCycleLength,
    avgPeriodLength: row.avgPeriodLength ?? defaults.avgPeriodLength,
    lutealPhaseLength: row.lutealPhaseLength ?? defaults.lutealPhaseLength,
    theme: (row.theme as "light" | "dark" | "system") ?? defaults.theme,
    language: row.language ?? defaults.language,
    biometricLock: row.biometricLock === 1,
    discreetMode: row.discreetMode === 1,
    reminderPeriodAhead: row.reminderPeriodAhead ?? defaults.reminderPeriodAhead,
    reminderDailyLog: row.reminderDailyLog === 1,
    error: null,
  } as SettingsContext
})

const updateSettingsFn = fromPromise(
  async ({ input }: { input: Partial<SettingsContext> }) => {
    const now = nowISO()

    const data: Record<string, unknown> = { updatedAt: now }
    if (input.avgCycleLength !== undefined) data.avgCycleLength = input.avgCycleLength
    if (input.avgPeriodLength !== undefined) data.avgPeriodLength = input.avgPeriodLength
    if (input.lutealPhaseLength !== undefined)
      data.lutealPhaseLength = input.lutealPhaseLength
    if (input.theme !== undefined) data.theme = input.theme
    if (input.language !== undefined) data.language = input.language
    if (input.biometricLock !== undefined)
      data.biometricLock = input.biometricLock ? 1 : 0
    if (input.discreetMode !== undefined) data.discreetMode = input.discreetMode ? 1 : 0
    if (input.reminderPeriodAhead !== undefined)
      data.reminderPeriodAhead = input.reminderPeriodAhead
    if (input.reminderDailyLog !== undefined)
      data.reminderDailyLog = input.reminderDailyLog ? 1 : 0

    updateSettings(data)
    return input
  },
)

export const settingsMachine = setup({
  types: {
    context: {} as SettingsContext,
    events: {} as SettingsEvent,
  },
  actors: {
    loadSettings,
    updateSettings: updateSettingsFn,
  },
  actions: {
    setError: assign({
      error: (_, err: unknown) =>
        err instanceof Error ? err.message : "An error occurred",
    }),
  },
}).createMachine({
  id: "settings",
  initial: "idle",
  context: { ...defaults },
  states: {
    idle: {
      on: { load: "loading", update: "updating" },
    },
    loading: {
      invoke: {
        src: "loadSettings",
        onDone: {
          target: "ready",
          actions: assign(({ event }) => ({ ...event.output, error: null })),
        },
        onError: {
          target: "idle",
          actions: "setError",
        },
      },
    },
    ready: {
      on: { load: "loading", update: "updating" },
    },
    updating: {
      invoke: {
        src: "updateSettings",
        input: ({ event }) => (event.type === "update" ? event.data : {}),
        onDone: {
          target: "ready",
          actions: assign(({ context, event }) => ({
            ...context,
            ...event.output,
            error: null,
          })),
        },
        onError: {
          target: "ready",
          actions: "setError",
        },
      },
    },
  },
})
