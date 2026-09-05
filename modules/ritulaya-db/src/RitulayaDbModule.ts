import { requireOptionalNativeModule } from "expo"
import type { Cycle } from "@/types/cycle"
import type { DayLog, DayLogCreate } from "@/types/day-log"

export interface SettingsRow {
  id: string
  avgCycleLength: number
  avgPeriodLength: number
  lutealPhaseLength: number
  theme: string
  language: string
  biometricLock: number
  discreetMode: number
  reminderPeriodAhead: number
  reminderDailyLog: number
  createdAt: string
  updatedAt: string
}

export interface SettingsPatch {
  avgCycleLength?: number
  avgPeriodLength?: number
  lutealPhaseLength?: number
  theme?: string
  language?: string
  biometricLock?: number
  discreetMode?: number
  reminderPeriodAhead?: number
  reminderDailyLog?: number
  createdAt?: string
}

interface RitulayaDbNativeModule {
  listCycles(): Promise<Cycle[]>
  logPeriod(flow: string, periodDays: number): Promise<void>
  logPeriodOn(date: string, flow: string, periodDays: number): Promise<void>
  listDayLogs(): Promise<DayLog[]>
  upsertDayLog(input: DayLogCreate): Promise<DayLog>
  saveDayEntry(input: DayLogCreate, periodDays: number): Promise<DayLog>
  deleteDayLog(id: string): Promise<void>
  getSettings(): Promise<SettingsRow | null>
  updateSettings(patch: SettingsPatch): Promise<void>
  latestDataChange(): Promise<string | null>
}

export default requireOptionalNativeModule<RitulayaDbNativeModule>("RitulayaDb")
