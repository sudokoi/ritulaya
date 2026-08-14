import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite"
import { drizzle } from "drizzle-orm/expo-sqlite"
import * as schema from "@/db/schema"

let dbInstance: ReturnType<typeof drizzle> | null = null

function runMigrations(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cycles (
      id TEXT PRIMARY KEY NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS day_logs (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      cycle_id TEXT,
      flow_intensity TEXT,
      symptoms TEXT DEFAULT '[]',
      mood TEXT,
      notes TEXT,
      cervical_mucus TEXT,
      bbt REAL,
      sexual_activity INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (cycle_id) REFERENCES cycles(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS day_logs_date_unique ON day_logs (date);

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY DEFAULT 'default' NOT NULL,
      avg_cycle_length INTEGER DEFAULT 28,
      avg_period_length INTEGER DEFAULT 5,
      luteal_phase_length INTEGER DEFAULT 14,
      theme TEXT DEFAULT 'system',
      language TEXT DEFAULT 'en',
      biometric_lock INTEGER DEFAULT 0,
      discreet_mode INTEGER DEFAULT 0,
      reminder_period_ahead INTEGER DEFAULT 2,
      reminder_daily_log INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_tombstones (
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL,
      PRIMARY KEY (entity, entity_id)
    );
  `)
}

export function getDatabase(): ReturnType<typeof drizzle> {
  if (dbInstance) return dbInstance

  const expoDb = openDatabaseSync("ritulaya.db")
  runMigrations(expoDb)
  dbInstance = drizzle(expoDb, { schema })
  return dbInstance
}

export function resetDatabase() {
  dbInstance = null
}
