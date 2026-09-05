import { EMPTY_HISTORY_FILTERS, searchDayEntries } from "@/domain/day-entry-history"
import type { DayLog } from "@/types/day-log"

const base: DayLog = {
  id: "first",
  date: "2026-06-01",
  cycleId: null,
  flowIntensity: "medium",
  symptoms: ["cramps"],
  mood: "calm",
  notes: "Café after lunch",
  cervicalMucus: null,
  bbt: null,
  sexualActivity: 0,
  createdAt: "",
  updatedAt: "",
}
const logs: DayLog[] = [
  base,
  {
    ...base,
    id: "second",
    date: "2026-06-05",
    symptoms: ["headache"],
    notes: "After lunch walk",
  },
  { ...base, id: "third", date: "2026-06-03", mood: "sad", notes: null },
]

test("history shows recorded entries newest first without reordering the source cache", () => {
  const result = searchDayEntries(logs, EMPTY_HISTORY_FILTERS)
  expect(result.error).toBeNull()
  expect(result.entries.map((entry) => entry.id)).toEqual(["second", "third", "first"])
  expect(logs.map((entry) => entry.id)).toEqual(["first", "second", "third"])
  expect(searchDayEntries([], EMPTY_HISTORY_FILTERS).entries).toEqual([])
})

test("note search is a trimmed, case-insensitive substring and handles Unicode and missing notes", () => {
  expect(
    searchDayEntries(logs, {
      ...EMPTY_HISTORY_FILTERS,
      notesQuery: "  AFTER LUNCH  ",
    }).entries.map((entry) => entry.id),
  ).toEqual(["second", "first"])
  expect(
    searchDayEntries(logs, { ...EMPTY_HISTORY_FILTERS, notesQuery: "cafe\u0301" })
      .entries,
  ).toEqual([base])
  expect(
    searchDayEntries(logs, { ...EMPTY_HISTORY_FILTERS, notesQuery: "calm" }).entries,
  ).toEqual([])
  expect(
    searchDayEntries(logs, { ...EMPTY_HISTORY_FILTERS, notesQuery: "   " }).entries,
  ).toHaveLength(3)
})

test("date bounds are inclusive, can be open-ended, and compare calendar dates", () => {
  expect(
    searchDayEntries(logs, {
      ...EMPTY_HISTORY_FILTERS,
      fromDate: "2026-06-03",
      toDate: "2026-06-05",
    }).entries.map((entry) => entry.id),
  ).toEqual(["second", "third"])
  expect(
    searchDayEntries(logs, {
      ...EMPTY_HISTORY_FILTERS,
      fromDate: "2026-06-05",
    }).entries.map((entry) => entry.id),
  ).toEqual(["second"])
  expect(
    searchDayEntries(logs, { ...EMPTY_HISTORY_FILTERS, toDate: "2026-06-01" }).entries,
  ).toEqual([base])
})

test("date, symptom, mood and note filters all apply together", () => {
  const filters = {
    ...EMPTY_HISTORY_FILTERS,
    notesQuery: "lunch",
    symptom: "cramps" as const,
    mood: "calm" as const,
  }
  expect(searchDayEntries(logs, filters).entries).toEqual([base])
  expect(searchDayEntries(logs, { ...filters, fromDate: "2026-06-02" }).entries).toEqual(
    [],
  )
})

test.each([
  "2026-02-29",
  "2026-04-31",
  "2026-13-01",
  "2026-6-1",
  "2026-06",
  "not a date",
])(
  "invalid date %s reports a validation error instead of silently broadening the search",
  (fromDate) => {
    expect(searchDayEntries(logs, { ...EMPTY_HISTORY_FILTERS, fromDate })).toEqual({
      entries: [],
      error: "invalidDate",
    })
    expect(
      searchDayEntries(logs, { ...EMPTY_HISTORY_FILTERS, toDate: fromDate }),
    ).toEqual({ entries: [], error: "invalidDate" })
  },
)

test("reversed ranges are rejected; valid leap days are accepted", () => {
  expect(
    searchDayEntries(logs, {
      ...EMPTY_HISTORY_FILTERS,
      fromDate: "2026-06-05",
      toDate: "2026-06-01",
    }).error,
  ).toBe("reversedRange")
  expect(
    searchDayEntries(logs, { ...EMPTY_HISTORY_FILTERS, fromDate: "2024-02-29" }).error,
  ).toBeNull()
})
