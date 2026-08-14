import RitulayaDb, { type SettingsRow, type SettingsPatch } from "../../modules/ritulaya-db"
import type { Cycle } from "@/types/cycle"
import type { DayLog, DayLogCreate } from "@/types/day-log"

export type { SettingsRow, SettingsPatch }

export async function listCycles(): Promise<Cycle[]> {
  if (!RitulayaDb) return []
  return RitulayaDb.listCycles()
}

export async function createCycle(startDate: string): Promise<Cycle | null> {
  if (!RitulayaDb) return null
  return RitulayaDb.createCycle(startDate)
}

export async function logPeriod(flow: string, periodDays: number): Promise<void> {
  if (!RitulayaDb) return
  await RitulayaDb.logPeriod(flow, periodDays)
}

export async function endCycle(id: string, endDate: string): Promise<void> {
  if (!RitulayaDb) return
  await RitulayaDb.endCycle(id, endDate)
}

export async function listDayLogs(): Promise<DayLog[]> {
  if (!RitulayaDb) return []
  return RitulayaDb.listDayLogs()
}

export async function findLastFlowDate(): Promise<string | null> {
  if (!RitulayaDb) return null
  return RitulayaDb.findLastFlowDate()
}

export async function upsertDayLog(input: DayLogCreate): Promise<DayLog | null> {
  if (!RitulayaDb) return null
  return RitulayaDb.upsertDayLog(input)
}

export async function deleteDayLog(id: string): Promise<void> {
  if (!RitulayaDb) return
  await RitulayaDb.deleteDayLog(id)
}

export async function findSettings(): Promise<SettingsRow | null> {
  if (!RitulayaDb) return null
  return RitulayaDb.getSettings()
}

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  if (!RitulayaDb) return
  await RitulayaDb.updateSettings(patch)
}
