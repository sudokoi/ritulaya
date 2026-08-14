import { eq, desc } from "drizzle-orm"
import { getDatabase } from "@/services/database"
import { dayLogs as dayLogsTable } from "@/db/schema"
import { nowISO, generateId } from "@/utils/date"
import type { DayLog, DayLogCreate, FlowIntensity } from "@/types/day-log"
import type { MoodKey } from "@/constants/moods"
import type { SymptomKey } from "@/constants/symptoms"

function parseSymptoms(value: string | null | undefined): SymptomKey[] {
  if (!value || value === "[]") return []
  try {
    return JSON.parse(value) as SymptomKey[]
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
