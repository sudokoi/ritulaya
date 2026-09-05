import { isValid, parseISO } from "date-fns"
import type { DayLog } from "@/types/day-log"
import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"

export interface HistoryFilters {
  notesQuery: string
  fromDate: string
  toDate: string
  symptom: SymptomKey | null
  mood: MoodKey | null
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  notesQuery: "",
  fromDate: "",
  toDate: "",
  symptom: null,
  mood: null,
}

interface HistoryResults {
  entries: DayLog[]
  error: "invalidDate" | "reversedRange" | null
}

function validDateFilter(value: string): boolean {
  return value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)))
}

function normalizeQuery(value: string): string {
  return value.normalize("NFKC").toLowerCase()
}

/** Search the loaded records only; filters and queries are never persisted. */
export function searchDayEntries(
  logs: readonly DayLog[],
  filters: HistoryFilters,
): HistoryResults {
  const from = filters.fromDate.trim()
  const to = filters.toDate.trim()
  if (!validDateFilter(from) || !validDateFilter(to)) {
    return { entries: [], error: "invalidDate" }
  }
  if (from && to && from > to) {
    return { entries: [], error: "reversedRange" }
  }

  const query = normalizeQuery(filters.notesQuery.trim())
  const entries = logs
    .filter(
      (log) =>
        (!from || log.date >= from) &&
        (!to || log.date <= to) &&
        (!filters.symptom || log.symptoms.includes(filters.symptom)) &&
        (!filters.mood || log.mood === filters.mood) &&
        (!query || normalizeQuery(log.notes ?? "").includes(query)),
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  return { entries, error: null }
}
