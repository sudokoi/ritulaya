import type { SettingsRow } from "@/services/db"

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

export const defaultSettings: SettingsState = {
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

export function toSettings(row: SettingsRow | null): SettingsState {
  if (!row) return { ...defaultSettings, loaded: true }
  return {
    avgCycleLength: row.avgCycleLength,
    avgPeriodLength: row.avgPeriodLength,
    lutealPhaseLength: row.lutealPhaseLength,
    theme: row.theme as SettingsState["theme"],
    language: row.language,
    biometricLock: row.biometricLock === 1,
    discreetMode: row.discreetMode === 1,
    reminderPeriodAhead: row.reminderPeriodAhead,
    reminderDailyLog: row.reminderDailyLog === 1,
    error: null,
    loaded: true,
  }
}
