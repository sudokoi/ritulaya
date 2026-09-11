jest.mock("@/services/db", () => ({
  saveDayEntry: jest.fn().mockResolvedValue({}),
  logPeriodOn: jest.fn().mockResolvedValue(undefined),
  upsertDayLog: jest.fn().mockResolvedValue({}),
  deleteDayLog: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/data/refresh", () => ({
  refreshAll: jest.fn().mockResolvedValue(undefined),
}))
import {
  saveDayEntry,
  deleteDayEntry,
  clearDayEntryFlow,
  type DayEntryInput,
} from "@/domain/day-entry"
import * as db from "@/services/db"
import { refreshAll } from "@/data/refresh"
import type { DayLog } from "@/types/day-log"

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

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers().setSystemTime(new Date(2026, 5, 5, 0, 30))
})
afterEach(() => jest.useRealTimers())

test("saving an entry uses one native command instead of a cache-based period write", async () => {
  await saveDayEntry(entry)
  expect(db.saveDayEntry).toHaveBeenCalledWith({
    date: "2026-06-01",
    flowIntensity: "medium",
    symptoms: [],
    mood: null,
    notes: "a note",
    cervicalMucus: null,
    bbt: null,
    sexualActivity: undefined,
    clearFields: ["mood", "cervicalMucus", "bbt", "sexualActivity"],
  })
  expect(db.logPeriodOn).not.toHaveBeenCalled()
  expect(db.upsertDayLog).not.toHaveBeenCalled()
  expect(refreshAll).toHaveBeenCalledTimes(1)
})

test("clearing flow sends only the selected date and flow, leaving other persisted fields alone", async () => {
  await clearDayEntryFlow(entry.date)
  expect(db.upsertDayLog).toHaveBeenCalledWith({
    date: entry.date,
    flowIntensity: "none",
  })
  expect(db.saveDayEntry).not.toHaveBeenCalled()
  expect(db.logPeriodOn).not.toHaveBeenCalled()
  expect(refreshAll).toHaveBeenCalledTimes(1)
})

test("deletion targets the selected entry and refreshes all dependent data", async () => {
  await deleteDayEntry("entry-id")
  expect(db.deleteDayLog).toHaveBeenCalledWith("entry-id")
  expect(refreshAll).toHaveBeenCalledTimes(1)
})

test("future-day saves and flow edits are rejected before persistence", async () => {
  await expect(saveDayEntry({ ...entry, date: "2026-06-06" })).rejects.toThrow(
    "future day",
  )
  await expect(clearDayEntryFlow("2026-06-06")).rejects.toThrow("future day")
  expect(db.saveDayEntry).not.toHaveBeenCalled()
  expect(db.upsertDayLog).not.toHaveBeenCalled()
  expect(refreshAll).not.toHaveBeenCalled()
})

test("today can be recorded even near the local midnight boundary", async () => {
  await saveDayEntry({ ...entry, date: "2026-06-05" })
  expect(db.saveDayEntry).toHaveBeenCalledWith(
    expect.objectContaining({ date: "2026-06-05" }),
  )
})

const saved: DayLog = {
  ...entry,
  id: "entry-id",
  cycleId: null,
  sexualActivity: 0,
  createdAt: "",
  updatedAt: "",
}
const commands = [
  {
    name: "save",
    run: () => saveDayEntry(entry),
    write: db.saveDayEntry,
    holdWrite: (gate: Promise<void>) =>
      jest.mocked(db.saveDayEntry).mockReturnValueOnce(gate.then(() => saved)),
  },
  {
    name: "clear flow",
    run: () => clearDayEntryFlow(entry.date),
    write: db.upsertDayLog,
    holdWrite: (gate: Promise<void>) =>
      jest.mocked(db.upsertDayLog).mockReturnValueOnce(gate.then(() => saved)),
  },
  {
    name: "delete",
    run: () => deleteDayEntry("entry-id"),
    write: db.deleteDayLog,
    holdWrite: (gate: Promise<void>) =>
      jest.mocked(db.deleteDayLog).mockReturnValueOnce(gate),
  },
]

test.each(commands)(
  "$name waits for persistence before refreshing and for refresh before completing",
  async ({ run, holdWrite }) => {
    let finishWrite!: () => void
    let finishRefresh!: () => void
    holdWrite(
      new Promise<void>((resolve) => {
        finishWrite = resolve
      }),
    )
    jest.mocked(refreshAll).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRefresh = resolve
        }),
    )
    let completed = false
    const work = run().then(() => {
      completed = true
    })
    expect(refreshAll).not.toHaveBeenCalled()
    finishWrite()
    await Promise.resolve()
    await Promise.resolve()
    expect(refreshAll).toHaveBeenCalledTimes(1)
    expect(completed).toBe(false)
    finishRefresh()
    await work
    expect(completed).toBe(true)
  },
)

test.each(commands)(
  "$name propagates persistence failure without refreshing",
  async ({ run, write }) => {
    const error = new Error("disk full")
    jest.mocked(write).mockRejectedValueOnce(error)
    await expect(run()).rejects.toBe(error)
    expect(refreshAll).not.toHaveBeenCalled()
  },
)

test.each(commands)(
  "$name propagates refresh failure rather than reporting success",
  async ({ run }) => {
    const error = new Error("refresh failed")
    jest.mocked(refreshAll).mockRejectedValueOnce(error)
    await expect(run()).rejects.toBe(error)
  },
)
