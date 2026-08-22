import { logPeriod, logPeriodOn, upsertDayLog } from "@/services/db"
import { refreshAll } from "@/data/refresh"
import { dayLogStore } from "@/stores/day-log-store"
import type { FlowIntensity } from "@/types/day-log"
import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"
import type { CervicalMucusKey } from "@/constants/cervical-mucus"

/**
 * The canonical shape of a day entry. Every consumer — the sheet, screens,
 * the store — refers to this type rather than restating the fields.
 */
export interface DayEntryInput {
  date: string
  flowIntensity: FlowIntensity | null
  symptoms: SymptomKey[]
  mood: MoodKey | null
  notes: string | null
  cervicalMucus: CervicalMucusKey | null
  bbt: number | null
  sexualActivity: boolean | null
}

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

export async function saveDayEntry(input: DayEntryInput, periodDays: number) {
  const existing = dayLogStore
    .getSnapshot()
    .context.logs.find((log) => log.date === input.date)
  const flow = input.flowIntensity
  const isPeriod = !!flow && flow !== "none"
  const wasPeriod = !!existing?.flowIntensity && existing.flowIntensity !== "none"

  if (isPeriod && !wasPeriod) {
    await logPeriodOn(input.date, flow, periodDays)
  }

  // The sheet always submits the full form, so null here means the user
  // cleared the field. The native layer treats "" (and 0 for BBT) as an
  // explicit clear, while an omitted field keeps its existing value.
  await upsertDayLog({
    date: input.date,
    flowIntensity: input.flowIntensity,
    symptoms: input.symptoms,
    mood: input.mood ?? "",
    notes: input.notes ?? "",
    cervicalMucus: input.cervicalMucus ?? "",
    bbt: input.bbt ?? 0,
    sexualActivity: input.sexualActivity ?? undefined,
  })

  await refreshAll()
}
