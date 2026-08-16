import { logPeriod, logPeriodOn, upsertDayLog } from "@/services/db"
import { refreshAll } from "@/data/refresh"
import { dayLogStore } from "@/stores/day-log-store"
import type { FlowIntensity } from "@/types/day-log"
import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"

export async function logPeriodToday(flow: FlowIntensity = "medium", periodDays = 3) {
  await logPeriod(flow, periodDays)
  await refreshAll()
}

export async function logPeriodOnDate(
  date: string,
  flow: FlowIntensity = "medium",
  periodDays = 3,
) {
  await logPeriodOn(date, flow, periodDays)
  await refreshAll()
}

export interface DayEntrySave {
  date: string
  flowIntensity: FlowIntensity | null
  symptoms: SymptomKey[]
  mood: MoodKey | null
  notes: string | null
}

export async function saveDayEntry(input: DayEntrySave, periodDays: number) {
  const existing = dayLogStore
    .getSnapshot()
    .context.logs.find((log) => log.date === input.date)
  const flow = input.flowIntensity
  const isPeriod = !!flow && flow !== "none"
  const wasPeriod = !!existing?.flowIntensity && existing.flowIntensity !== "none"

  if (isPeriod && !wasPeriod) {
    await logPeriodOnDate(input.date, flow, periodDays)
  }

  await upsertDayLog({
    date: input.date,
    flowIntensity: input.flowIntensity,
    symptoms: input.symptoms,
    mood: input.mood,
    notes: input.notes,
  })
}
