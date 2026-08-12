import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"

export const cycles = sqliteTable("cycles", {
  id: text("id").primaryKey(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const dayLogs = sqliteTable("day_logs", {
  id: text("id").primaryKey(),
  date: text("date").notNull().unique(),
  cycleId: text("cycle_id").references(() => cycles.id),
  flowIntensity: text("flow_intensity"),
  symptoms: text("symptoms").default("[]"),
  mood: text("mood"),
  notes: text("notes"),
  cervicalMucus: text("cervical_mucus"),
  bbt: real("bbt"),
  sexualActivity: integer("sexual_activity").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("default"),
  avgCycleLength: integer("avg_cycle_length").default(28),
  avgPeriodLength: integer("avg_period_length").default(5),
  lutealPhaseLength: integer("luteal_phase_length").default(14),
  theme: text("theme").default("system"),
  language: text("language").default("en"),
  biometricLock: integer("biometric_lock").default(0),
  discreetMode: integer("discreet_mode").default(0),
  reminderPeriodAhead: integer("reminder_period_ahead").default(2),
  reminderDailyLog: integer("reminder_daily_log").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})
