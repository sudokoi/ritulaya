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
  loaded: boolean
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
  loaded: false,
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
    loaded: true,
  }
}

export async function loadSettings() {
  try {
    const row = await findSettings()
    if (!row) {
      settingsStore.send({ type: "set", settings: { ...defaults, loaded: true } })
      return
    }
    settingsStore.send({ type: "set", settings: toSettings(row) })
  } catch (e) {
    settingsStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "An error occurred",
    })
    throw e
  }
}

export type SettingsUpdate = Partial<Omit<SettingsState, "error" | "loaded">>

export async function updateSettingsFn(patch: SettingsUpdate) {
  try {
    const { biometricLock, discreetMode, reminderDailyLog, ...fields } = patch
    const data: SettingsPatch = { ...fields }
    if (biometricLock !== undefined) data.biometricLock = biometricLock ? 1 : 0
    if (discreetMode !== undefined) data.discreetMode = discreetMode ? 1 : 0
    if (reminderDailyLog !== undefined) data.reminderDailyLog = reminderDailyLog ? 1 : 0

    await updateSettings(data)
    settingsStore.send({ type: "patch", settings: patch })
  } catch (e) {
    settingsStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "An error occurred",
    })
    throw e
  }
}
