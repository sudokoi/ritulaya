import { eq } from "drizzle-orm"
import { getDatabase } from "@/services/database"
import { settings as settingsTable } from "@/db/schema"

export type SettingsRow = typeof settingsTable.$inferSelect

export function findSettings(): SettingsRow | null {
  const db = getDatabase()
  return (
    db.select().from(settingsTable).where(eq(settingsTable.id, "default")).get() ?? null
  )
}

export function insertSettings(row: typeof settingsTable.$inferInsert) {
  const db = getDatabase()
  db.insert(settingsTable).values(row).run()
}

export function updateSettings(patch: Record<string, unknown>) {
  const db = getDatabase()
  db.update(settingsTable).set(patch).where(eq(settingsTable.id, "default")).run()
}
