import { native, nativeCall } from "@/lib/native"
import type { SettingsRow, SettingsPatch } from "../../modules/ritulaya-db"
import type { Cycle } from "@/types/cycle"
import type { DayLog, DayLogCreate } from "@/types/day-log"

export type { SettingsRow, SettingsPatch }

export function listCycles(): Promise<Cycle[]> {
  return nativeCall(native.db, (db) => db.listCycles(), [])
}

export function logPeriod(flow: string, periodDays: number): Promise<void> {
  return nativeCall(native.db, (db) => db.logPeriod(flow, periodDays), undefined)
}

export function logPeriodOn(
  date: string,
  flow: string,
  periodDays: number,
): Promise<void> {
  return nativeCall(native.db, (db) => db.logPeriodOn(date, flow, periodDays), undefined)
}

export function listDayLogs(): Promise<DayLog[]> {
  return nativeCall(native.db, (db) => db.listDayLogs(), [])
}

export function upsertDayLog(input: DayLogCreate): Promise<DayLog | null> {
  return nativeCall(native.db, (db) => db.upsertDayLog(input), null as DayLog | null)
}

export function deleteDayLog(id: string): Promise<void> {
  return nativeCall(native.db, (db) => db.deleteDayLog(id), undefined)
}

export function findSettings(): Promise<SettingsRow | null> {
  return nativeCall(native.db, (db) => db.getSettings(), null as SettingsRow | null)
}

export function updateSettings(patch: SettingsPatch): Promise<void> {
  return nativeCall(native.db, (db) => db.updateSettings(patch), undefined)
}
