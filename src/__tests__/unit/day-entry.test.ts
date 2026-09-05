jest.mock("@/services/db", () => ({
  saveDayEntry: jest.fn().mockResolvedValue({}),
  logPeriodOn: jest.fn().mockResolvedValue(undefined),
  upsertDayLog: jest.fn().mockResolvedValue({}),
}))
jest.mock("@/data/refresh", () => ({
  refreshAll: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/stores/day-log-store", () => ({
  dayLogStore: { getSnapshot: jest.fn(() => ({ context: { logs: [] } })) },
}))

import { saveDayEntry, type DayEntryInput } from "@/domain/day-entry"
import * as db from "@/services/db"
import { refreshAll } from "@/data/refresh"

const entry: DayEntryInput = {
  date: "2026-06-01",
  flowIntensity: "medium",
  symptoms: [],
  mood: null,
  notes: "a note",
  cervicalMucus: null,
  bbt: null,
  sexualActivity: null,
}

test("saving an entry uses one native command instead of a cache-based period write", async () => {
  await saveDayEntry(entry, 3)
  expect(db.saveDayEntry).toHaveBeenCalledWith(
    {
      date: "2026-06-01",
      flowIntensity: "medium",
      symptoms: [],
      mood: "",
      notes: "a note",
      cervicalMucus: "",
      bbt: 0,
      sexualActivity: undefined,
    },
    3,
  )
  expect(db.logPeriodOn).not.toHaveBeenCalled()
  expect(db.upsertDayLog).not.toHaveBeenCalled()
  expect(refreshAll).toHaveBeenCalledTimes(1)
})
