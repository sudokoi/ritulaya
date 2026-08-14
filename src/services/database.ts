import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite"
import { drizzle } from "drizzle-orm/expo-sqlite"
import * as schema from "@/db/schema"
import migrations from "@/db/migrations/migrations.js"

let dbInstance: ReturnType<typeof drizzle> | null = null

function hasTable(expoDb: SQLiteDatabase, name: string): boolean {
  return (
    expoDb.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      name,
    ).length > 0
  )
}

function applyMigrations(expoDb: SQLiteDatabase) {
  expoDb.execSync(
    `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    )`,
  )

  const migrationsByName = migrations.migrations as Record<string, string>
  const applied = expoDb.getAllSync<{ created_at: number }>(
    "SELECT created_at FROM __drizzle_migrations",
  )

  if (applied.length === 0 && hasTable(expoDb, "cycles")) {
    expoDb.withTransactionSync(() => {
      for (const entry of migrations.journal.entries) {
        expoDb.runSync(
          "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
          "",
          entry.when,
        )
      }
    })
    return
  }

  const lastApplied = applied.reduce((max, row) => Math.max(max, row.created_at), 0)

  expoDb.withTransactionSync(() => {
    for (const entry of migrations.journal.entries) {
      if (entry.when <= lastApplied) continue
      const query = migrationsByName[`m${String(entry.idx).padStart(4, "0")}`]
      if (!query) throw new Error(`Missing migration: ${entry.tag}`)
      for (const statement of query.split("--> statement-breakpoint")) {
        expoDb.execSync(statement)
      }
      expoDb.runSync(
        "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        "",
        entry.when,
      )
    }
  })
}

export function getDatabase(): ReturnType<typeof drizzle> {
  if (dbInstance) return dbInstance

  const expoDb = openDatabaseSync("ritulaya.db")
  applyMigrations(expoDb)
  dbInstance = drizzle(expoDb, { schema })
  return dbInstance
}
