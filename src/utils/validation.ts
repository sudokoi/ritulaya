import { z } from "zod"

export const dayLogCreateSchema = z.object({
  date: z.string(),
  cycleId: z.string().nullable().optional(),
  flowIntensity: z
    .enum(["none", "spotting", "light", "medium", "heavy"])
    .nullable()
    .optional(),
  symptoms: z.array(z.string()).optional(),
  mood: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  cervicalMucus: z.string().nullable().optional(),
  bbt: z.number().nullable().optional(),
  sexualActivity: z.boolean().optional(),
})

export const cycleCreateSchema = z.object({
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
})

export const settingsUpdateSchema = z.object({
  avgCycleLength: z.number().min(15).max(60).optional(),
  avgPeriodLength: z.number().min(1).max(15).optional(),
  lutealPhaseLength: z.number().min(10).max(18).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().optional(),
  biometricLock: z.boolean().optional(),
  discreetMode: z.boolean().optional(),
  reminderPeriodAhead: z.number().min(0).max(7).optional(),
  reminderDailyLog: z.boolean().optional(),
})
