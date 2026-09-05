jest.mock("expo-file-system", () => ({
  File: class MockFile {
    uri = ""
  },
  Paths: { cache: "/tmp" },
}))
jest.mock("expo-sharing", () => ({
  isAvailableAsync: async () => false,
  shareAsync: async () => undefined,
}))
jest.mock("@/services/db", () => ({
  listCycles: async () => [],
  listDayLogs: async () => [],
}))

import { csvCell, toCyclesCsv, toLogsCsv } from "@/services/export"
import type { Cycle } from "@/types/cycle"
import type { DayLog } from "@/types/day-log"

const baseLog: DayLog = {
  id: "1",
  date: "2026-01-01",
  cycleId: null,
  flowIntensity: "medium",
  symptoms: ["cramps", "bloating"],
  mood: "calm",
  notes: null,
  cervicalMucus: null,
  bbt: null,
  sexualActivity: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("csvCell", () => {
  it("wraps every cell in quotes", () => {
    expect(csvCell("plain")).toBe('"plain"')
  })

  it("escapes embedded quotes by doubling them", () => {
    expect(csvCell('she said "hi"')).toBe('"she said ""hi"""')
  })

  it("preserves commas and newlines inside the quoted cell", () => {
    expect(csvCell("a,b\nc")).toBe('"a,b\nc"')
  })

  it("neutralizes formula injection prefixes", () => {
    expect(csvCell("=cmd")).toBe('"\'=cmd"')
    expect(csvCell("+sum")).toBe('"\'+sum"')
    expect(csvCell("@x")).toBe('"\'@x"')
    expect(csvCell("-1")).toBe('"\'-1"')
    expect(csvCell("\t=cmd")).toBe('"\'\t=cmd"')
    expect(csvCell("\r=cmd")).toBe('"\'\r=cmd"')
  })
})

describe("toCyclesCsv", () => {
  it("emits a header and quoted rows", () => {
    const cycle: Cycle = {
      id: "c1",
      startDate: "2026-01-01",
      endDate: "2026-01-28",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }
    const csv = toCyclesCsv([cycle])
    const lines = csv.split("\n")

    expect(lines[0]).toBe("start_date,end_date,created_at,id,updated_at")
    expect(lines[1]).toBe(
      '"2026-01-01","2026-01-28","2026-01-01T00:00:00.000Z","c1","2026-01-01T00:00:00.000Z"',
    )
  })

  it("renders a missing end date as an empty cell", () => {
    const cycle: Cycle = {
      id: "c1",
      startDate: "2026-01-01",
      endDate: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }

    expect(toCyclesCsv([cycle]).split("\n")[1]).toBe(
      '"2026-01-01","","2026-01-01T00:00:00.000Z","c1","2026-01-01T00:00:00.000Z"',
    )
  })
})

describe("toLogsCsv", () => {
  it("joins symptoms with semicolons inside one quoted cell", () => {
    const csv = toLogsCsv([baseLog])
    const lines = csv.split("\n")

    expect(lines[0]).toBe(
      "date,flow_intensity,symptoms,mood,notes,id,cycle_id,cervical_mucus,bbt,sexual_activity,created_at,updated_at",
    )
    expect(lines[1]).toBe(
      '"2026-01-01","medium","cramps;bloating","calm","","1","","","","0","2026-01-01T00:00:00.000Z","2026-01-01T00:00:00.000Z"',
    )
  })

  it("keeps notes containing commas intact", () => {
    const log = { ...baseLog, notes: "cramps, bad" }
    const row = toLogsCsv([log]).split("\n")[1]

    expect(row).toContain('"2026-01-01","medium","cramps;bloating","calm","cramps, bad"')
  })

  it("exports body fields, identities, relationships and timestamps", () => {
    const csv = toLogsCsv([
      {
        ...baseLog,
        cycleId: "c1",
        cervicalMucus: "creamy",
        bbt: 36.7,
        sexualActivity: 1,
      },
    ])
    expect(csv.split("\n")[1]).toContain(
      '"1","c1","creamy","36.7","1","2026-01-01T00:00:00.000Z","2026-01-01T00:00:00.000Z"',
    )
  })
})
