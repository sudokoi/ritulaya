import { eq, desc, and, gte, lte } from "drizzle-orm"
import { getDatabase } from "@/services/database"
import { dayLogs as dayLogsTable, syncTombstones } from "@/db/schema"
import { nowISO, generateId } from "@/utils/date"
import type { DayLog, DayLogCreate, DayLogUpdate, FlowIntensity } from "@/types/day-log"
import type { MoodKey } from "@/constants/moods"

function parseSymptoms(value: string | null | undefined): string[] {
  if (!value || value === "[]") return []
  try {
    return JSON.parse(value) as string[]
  } catch {
    return []
  }
}

function toDayLog(row: Record<string, unknown>): DayLog {
  return {
    id: row.id as string,
    date: row.date as string,
    cycleId: (row.cycleId as string) ?? null,
    flowIntensity: (row.flowIntensity as FlowIntensity) ?? null,
    symptoms: parseSymptoms(row.symptoms as string | null),
    mood: (row.mood as MoodKey) ?? null,
    notes: (row.notes as string) ?? null,
    cervicalMucus: (row.cervicalMucus as string) ?? null,
    bbt: (row.bbt as number) ?? null,
    sexualActivity: (row.sexualActivity as number) ?? 0,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }
}

export function listDayLogs(): DayLog[] {
  const db = getDatabase()
  const rows = db.select().from(dayLogsTable).orderBy(desc(dayLogsTable.date)).all()
  return rows.map(toDayLog)
}

export function listDayLogsRange(startDate: string, endDate: string): DayLog[] {
  const db = getDatabase()
  const rows = db
    .select()
    .from(dayLogsTable)
    .where(and(gte(dayLogsTable.date, startDate), lte(dayLogsTable.date, endDate)))
    .orderBy(desc(dayLogsTable.date))
    .all()
  return rows.map(toDayLog)
}

export function upsertDayLog(input: DayLogCreate): DayLog {
  const db = getDatabase()
  const now = nowISO()

  const existing = db
    .select()
    .from(dayLogsTable)
    .where(eq(dayLogsTable.date, input.date))
    .get()

  const symptoms = input.symptoms ?? []
  const symptomsJson = JSON.stringify(symptoms)

  if (existing) {
    db.update(dayLogsTable)
      .set({
        flowIntensity: input.flowIntensity ?? existing.flowIntensity,
        symptoms: symptomsJson,
        mood: input.mood ?? existing.mood,
        notes: input.notes ?? existing.notes,
        cervicalMucus: input.cervicalMucus ?? existing.cervicalMucus,
        bbt: input.bbt ?? existing.bbt,
        sexualActivity: input.sexualActivity ? 1 : existing.sexualActivity,
        cycleId: input.cycleId ?? existing.cycleId,
        updatedAt: now,
      })
      .where(eq(dayLogsTable.id, existing.id))
      .run()

    return toDayLog({
      ...existing,
      flowIntensity: input.flowIntensity ?? existing.flowIntensity,
      symptoms: symptomsJson,
      mood: input.mood ?? existing.mood,
      notes: input.notes ?? existing.notes,
      cervicalMucus: input.cervicalMucus ?? existing.cervicalMucus,
      bbt: input.bbt ?? existing.bbt,
      sexualActivity: input.sexualActivity ? 1 : existing.sexualActivity,
      cycleId: input.cycleId ?? existing.cycleId,
      updatedAt: now,
    })
  }

  const log: DayLog = {
    id: generateId(),
    date: input.date,
    cycleId: input.cycleId ?? null,
    flowIntensity: input.flowIntensity ?? null,
    symptoms,
    mood: input.mood ?? null,
    notes: input.notes ?? null,
    cervicalMucus: input.cervicalMucus ?? null,
    bbt: input.bbt ?? null,
    sexualActivity: input.sexualActivity ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  }

  db.insert(dayLogsTable)
    .values({
      id: log.id,
      date: log.date,
      cycleId: log.cycleId,
      flowIntensity: log.flowIntensity,
      symptoms: symptomsJson,
      mood: log.mood,
      notes: log.notes,
      cervicalMucus: log.cervicalMucus,
      bbt: log.bbt,
      sexualActivity: log.sexualActivity,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    })
    .run()
  return log
}

export function updateDayLog(id: string, input: DayLogUpdate): DayLog | null {
  const db = getDatabase()
  const now = nowISO()

  const data: Record<string, unknown> = { updatedAt: now }
  if (input.flowIntensity !== undefined) data.flowIntensity = input.flowIntensity
  if (input.symptoms !== undefined) data.symptoms = JSON.stringify(input.symptoms)
  if (input.mood !== undefined) data.mood = input.mood
  if (input.notes !== undefined) data.notes = input.notes
  if (input.cervicalMucus !== undefined) data.cervicalMucus = input.cervicalMucus
  if (input.bbt !== undefined) data.bbt = input.bbt
  if (input.sexualActivity !== undefined)
    data.sexualActivity = input.sexualActivity ? 1 : 0
  if (input.cycleId !== undefined) data.cycleId = input.cycleId

  db.update(dayLogsTable).set(data).where(eq(dayLogsTable.id, id)).run()

  const existing = db.select().from(dayLogsTable).where(eq(dayLogsTable.id, id)).get()
  return existing ? toDayLog(existing) : null
}

export function deleteDayLog(id: string) {
  const db = getDatabase()
  db.delete(dayLogsTable).where(eq(dayLogsTable.id, id)).run()
  db.insert(syncTombstones)
    .values({ entity: "day_log", entityId: id, deletedAt: nowISO() })
    .onConflictDoUpdate({
      target: [syncTombstones.entity, syncTombstones.entityId],
      set: { deletedAt: nowISO() },
    })
    .run()
}
