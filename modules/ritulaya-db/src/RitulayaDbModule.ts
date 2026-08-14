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
  createCycle(startDate: string): Promise<Cycle>
  logPeriod(flow: string, periodDays: number): Promise<void>
  endCycle(id: string, endDate: string): Promise<void>
  listDayLogs(): Promise<DayLog[]>
  findLastFlowDate(): Promise<string | null>
  upsertDayLog(input: DayLogCreate): Promise<DayLog>
  deleteDayLog(id: string): Promise<void>
  getSettings(): Promise<SettingsRow | null>
  updateSettings(patch: SettingsPatch): Promise<void>
}

export default requireOptionalNativeModule<RitulayaDbNativeModule>("RitulayaDb")
