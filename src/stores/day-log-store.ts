import { createStore } from "@xstate/store"
import { eq, desc, and, gte, lte } from "drizzle-orm"
import { getDatabase } from "@/services/database"
import { dayLogs as dayLogsTable, syncTombstones } from "@/db/schema"
import { nowISO, generateId, todayISO } from "@/utils/date"
import type { DayLog, DayLogCreate, DayLogUpdate, FlowIntensity } from "@/types/day-log"
import type { MoodKey } from "@/constants/moods"

interface DayLogState {
  logs: DayLog[]
  todayLog: DayLog | null
  loaded: boolean
}

export const dayLogStore = createStore({
  context: {
    logs: [] as DayLog[],
    todayLog: null as DayLog | null,
    loaded: false,
  } as DayLogState,
  on: {
    setLogs: (ctx, event: { logs: DayLog[] }) => ({
      ...ctx,
      logs: event.logs,
      todayLog: event.logs.find((l) => l.date === todayISO()) ?? null,
      loaded: true,
    }),
    upsertLog: (ctx, event: { log: DayLog }) => {
      const existing = ctx.logs.findIndex((l) => l.id === event.log.id)
      const logs =
        existing >= 0
          ? ctx.logs.map((l) => (l.id === event.log.id ? event.log : l))
          : [event.log, ...ctx.logs]
      return {
        ...ctx,
        logs,
        todayLog: event.log.date === todayISO() ? event.log : ctx.todayLog,
      }
    },
    removeLog: (ctx, event: { id: string }) => {
      const filtered = ctx.logs.filter((l) => l.id !== event.id)
      return {
        ...ctx,
        logs: filtered,
        todayLog:
          ctx.todayLog?.id === event.id
            ? (filtered.find((l) => l.date === todayISO()) ?? null)
            : ctx.todayLog,
      }
    },
  },
})

function toDayLog(row: Record<string, unknown>): DayLog {
  return {
    id: row.id as string,
    date: row.date as string,
    cycleId: (row.cycleId as string) ?? null,
    flowIntensity: (row.flowIntensity as FlowIntensity) ?? null,
    symptoms: (row.symptoms as string) ?? "[]",
    mood: (row.mood as MoodKey) ?? null,
    notes: (row.notes as string) ?? null,
    cervicalMucus: (row.cervicalMucus as string) ?? null,
    bbt: (row.bbt as number) ?? null,
    sexualActivity: (row.sexualActivity as number) ?? 0,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }
}

export async function loadDayLogs() {
  const db = getDatabase()
  const all = db.select().from(dayLogsTable).orderBy(desc(dayLogsTable.date)).all()
  dayLogStore.send({ type: "setLogs", logs: all.map(toDayLog) })
}

export async function loadDayLogsRange(startDate: string, endDate: string) {
  const db = getDatabase()
  const range = db
    .select()
    .from(dayLogsTable)
    .where(and(gte(dayLogsTable.date, startDate), lte(dayLogsTable.date, endDate)))
    .orderBy(desc(dayLogsTable.date))
    .all()
  dayLogStore.send({ type: "setLogs", logs: range.map(toDayLog) })
}

export async function upsertDayLog(input: DayLogCreate): Promise<DayLog> {
  const db = getDatabase()
  const now = nowISO()

  const existing = db
    .select()
    .from(dayLogsTable)
    .where(eq(dayLogsTable.date, input.date))
    .get()

  const symptoms = JSON.stringify(input.symptoms ?? [])

  if (existing) {
    db.update(dayLogsTable)
      .set({
        flowIntensity: input.flowIntensity ?? existing.flowIntensity,
        symptoms,
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

    const updated = toDayLog({
      ...existing,
      flowIntensity: input.flowIntensity ?? existing.flowIntensity,
      symptoms,
      mood: input.mood ?? existing.mood,
      notes: input.notes ?? existing.notes,
      cervicalMucus: input.cervicalMucus ?? existing.cervicalMucus,
      bbt: input.bbt ?? existing.bbt,
      sexualActivity: input.sexualActivity ? 1 : existing.sexualActivity,
      cycleId: input.cycleId ?? existing.cycleId,
      updatedAt: now,
    })

    dayLogStore.send({ type: "upsertLog", log: updated })
    return updated
  }

  const id = generateId()
  const log: DayLog = {
    id,
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

  db.insert(dayLogsTable).values(log).run()
  dayLogStore.send({ type: "upsertLog", log })
  return log
}

export async function updateDayLog(id: string, input: DayLogUpdate): Promise<void> {
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

  if (existing) {
    dayLogStore.send({ type: "upsertLog", log: toDayLog(existing) })
  }
}

export async function deleteDayLog(id: string) {
  const db = getDatabase()
  db.delete(dayLogsTable).where(eq(dayLogsTable.id, id)).run()
  db.insert(syncTombstones)
    .values({ entity: "day_log", entityId: id, deletedAt: nowISO() })
    .onConflictDoUpdate({
      target: [syncTombstones.entity, syncTombstones.entityId],
      set: { deletedAt: nowISO() },
    })
    .run()
  dayLogStore.send({ type: "removeLog", id })
}
