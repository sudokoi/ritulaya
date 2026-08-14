import { desc } from "drizzle-orm"
import { getDatabase } from "@/services/database"
import { cycles as cyclesTable } from "@/db/schema"
import { nowISO, generateId } from "@/utils/date"
import type { Cycle } from "@/types/cycle"

export function listCycles(): Cycle[] {
  const db = getDatabase()
  return db.select().from(cyclesTable).orderBy(desc(cyclesTable.startDate)).all()
}

export function findCurrentCycle(): Cycle | null {
  return listCycles().find((cycle) => cycle.endDate === null) ?? null
}

export function createCycle(startDate: string): Cycle {
  const db = getDatabase()
  const now = nowISO()
  const cycle: Cycle = {
    id: generateId(),
    startDate,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  }
  db.insert(cyclesTable).values(cycle).run()
  return cycle
}
