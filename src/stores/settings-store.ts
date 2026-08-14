import { createStore } from "@xstate/store"
import {
  findSettings,
  insertSettings,
  updateSettings,
  type SettingsRow,
} from "@/db/settings"
import { nowISO } from "@/utils/date"

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
    const now = nowISO()
    const data: Record<string, unknown> = { updatedAt: now }
    if (patch.avgCycleLength !== undefined) data.avgCycleLength = patch.avgCycleLength
    if (patch.avgPeriodLength !== undefined) data.avgPeriodLength = patch.avgPeriodLength
    if (patch.lutealPhaseLength !== undefined)
      data.lutealPhaseLength = patch.lutealPhaseLength
    if (patch.theme !== undefined) data.theme = patch.theme
    if (patch.language !== undefined) data.language = patch.language
    if (patch.biometricLock !== undefined)
      data.biometricLock = patch.biometricLock ? 1 : 0
    if (patch.discreetMode !== undefined) data.discreetMode = patch.discreetMode ? 1 : 0
    if (patch.reminderPeriodAhead !== undefined)
      data.reminderPeriodAhead = patch.reminderPeriodAhead
    if (patch.reminderDailyLog !== undefined)
      data.reminderDailyLog = patch.reminderDailyLog ? 1 : 0

    updateSettings(data)
    settingsStore.send({ type: "patch", settings: patch })
  } catch (e) {
    settingsStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "An error occurred",
    })
  }
}
