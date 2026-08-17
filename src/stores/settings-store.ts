import { createStore } from "@xstate/store"
import {
  findSettings,
  updateSettings,
  type SettingsRow,
  type SettingsPatch,
} from "@/services/db"

export interface SettingsState {
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

const defaults: SettingsState = {
  avgCycleLength: 28,
  avgPeriodLength: 3,
  lutealPhaseLength: 14,
  theme: "system",
  language: "en",
  biometricLock: false,
  discreetMode: false,
  reminderPeriodAhead: 2,
  reminderDailyLog: false,
  error: null,
}

export const settingsStore = createStore({
  context: { ...defaults },
  on: {
    set: (_, event: { settings: SettingsState }) => event.settings,
    patch: (ctx, event: { settings: Partial<SettingsState> }) => ({
      ...ctx,
      ...event.settings,
      error: null,
    }),
    setError: (ctx, event: { error: string }) => ({ ...ctx, error: event.error }),
  },
})

function toSettings(row: SettingsRow): SettingsState {
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
  }
}

export async function loadSettings() {
  try {
    const row = await findSettings()
    if (!row) {
      settingsStore.send({ type: "set", settings: defaults })
      return
    }
    settingsStore.send({ type: "set", settings: toSettings(row) })
  } catch (e) {
    settingsStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "An error occurred",
    })
  }
}

export async function updateSettingsFn(patch: Partial<SettingsState>) {
  try {
    const next = { ...settingsStore.getSnapshot().context, ...patch }
    const data: SettingsPatch = {
      avgCycleLength: next.avgCycleLength,
      avgPeriodLength: next.avgPeriodLength,
      lutealPhaseLength: next.lutealPhaseLength,
      theme: next.theme,
      language: next.language,
      biometricLock: next.biometricLock ? 1 : 0,
      discreetMode: next.discreetMode ? 1 : 0,
      reminderPeriodAhead: next.reminderPeriodAhead,
      reminderDailyLog: next.reminderDailyLog ? 1 : 0,
    }

    await updateSettings(data)
    settingsStore.send({ type: "patch", settings: patch })
  } catch (e) {
    settingsStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "An error occurred",
    })
  }
}
