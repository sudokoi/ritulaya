import { logPeriod, logPeriodOn, saveDayEntry as saveDayEntryInDb } from "@/services/db"
import { refreshAll } from "@/data/refresh"
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
  // The sheet always submits the full form, so null here means the user
  // cleared the field. The native decoder resolveDayLogFields
  // (modules/ritulaya-db/.../DayLogPatch.kt) treats "" and 0 as explicit
  // clears; an omitted field keeps its existing value.
  await saveDayEntryInDb(
    {
      date: input.date,
      flowIntensity: input.flowIntensity,
      symptoms: input.symptoms,
      mood: input.mood ?? "",
      notes: input.notes ?? "",
      cervicalMucus: input.cervicalMucus ?? "",
      bbt: input.bbt ?? 0,
      sexualActivity: input.sexualActivity ?? undefined,
    },
    periodDays,
  )

  await refreshAll()
}
