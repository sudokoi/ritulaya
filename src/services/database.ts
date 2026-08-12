import { openDatabaseSync } from "expo-sqlite"
import { drizzle } from "drizzle-orm/expo-sqlite"
import * as schema from "@/db/schema"

let dbInstance: ReturnType<typeof drizzle> | null = null

export function getDatabase(): ReturnType<typeof drizzle> {
  if (dbInstance) return dbInstance

  const expoDb = openDatabaseSync("ritulaya.db")
  dbInstance = drizzle(expoDb, { schema })
  return dbInstance
}

export function resetDatabase() {
  dbInstance = null
}
