import { native, nativeRequire } from "@/lib/native"
import type { SettingsRow, SettingsPatch } from "../../modules/ritulaya-db"
import type { Cycle } from "@/types/cycle"
import type { DayLog, DayLogCreate } from "@/types/day-log"

export type { SettingsRow, SettingsPatch }

export function listCycles(): Promise<Cycle[]> {
  return nativeRequire(native.db, (db) => db.listCycles())
}

export function logPeriod(flow: string, periodDays: number): Promise<void> {
  return nativeRequire(native.db, (db) => db.logPeriod(flow, periodDays))
}

export function logPeriodOn(
  date: string,
  flow: string,
  periodDays: number,
): Promise<void> {
  return nativeRequire(native.db, (db) => db.logPeriodOn(date, flow, periodDays))
}

export function listDayLogs(): Promise<DayLog[]> {
  return nativeRequire(native.db, (db) => db.listDayLogs())
}

export function upsertDayLog(input: DayLogCreate): Promise<DayLog | null> {
  return nativeRequire(native.db, (db) => db.upsertDayLog(input))
}

export function deleteDayLog(id: string): Promise<void> {
  return nativeRequire(native.db, (db) => db.deleteDayLog(id))
}

export function findSettings(): Promise<SettingsRow | null> {
  return nativeRequire(native.db, (db) => db.getSettings())
}

export function updateSettings(patch: SettingsPatch): Promise<void> {
  return nativeRequire(native.db, (db) => db.updateSettings(patch))
}
