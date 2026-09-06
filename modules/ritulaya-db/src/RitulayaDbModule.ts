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

export interface ReminderInput {
  kind: "daily" | "period" | "overdue"
  discreet: boolean
  language: string
  daysAhead: number
  title: string
  body: string
  channelId: string
  timestamp: number
}

interface RitulayaDbNativeModule {
  scheduleReminder(input: ReminderInput): Promise<boolean>
  readAppSnapshot(): Promise<{
    cycles: Cycle[]
    logs: DayLog[]
    settings: SettingsRow | null
    dataVersion: string
  }>
  previewCycleRepair(): Promise<{
    token: string
    before: Cycle[]
    after: Cycle[]
    reassociatedEntries: number
  }>
  applyCycleRepair(token: string): Promise<void>
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
