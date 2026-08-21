import {
  completedCycleLengths,
  phaseCorrelations,
  regularityCopy,
} from "@/lib/cycle-insights"
import type { Cycle } from "@/types/cycle"
import type { DayLog } from "@/types/day-log"

const config = { avgCycleLength: 28, avgPeriodLength: 5, lutealPhaseLength: 14 }

function cycle(id: string, start: string, end: string | null): Cycle {
  return { id, startDate: start, endDate: end, createdAt: "", updatedAt: "" }
}

function log(date: string, symptoms: string[] = [], mood: string | null = null): DayLog {
  return {
    id: `log-${date}`,
    date,
    cycleId: null,
    flowIntensity: "none",
    symptoms: symptoms as DayLog["symptoms"],
    mood: mood as DayLog["mood"],
    notes: null,
    cervicalMucus: null,
    bbt: null,
    sexualActivity: 0,
    createdAt: "",
    updatedAt: "",
  }
}

describe("completedCycleLengths", () => {
  it("returns only completed cycles, most recent first", () => {
    const cycles = [
      cycle("a", "2026-01-01", "2026-01-27"),
      cycle("b", "2026-01-28", null),
      cycle("c", "2026-02-20", "2026-03-18"),
    ]

    const rows = completedCycleLengths(cycles)

    expect(rows).toEqual([
      { startDate: "2026-02-20", length: 27 },
      { startDate: "2026-01-01", length: 27 },
    ])
  })
})

describe("regularityCopy", () => {
  it("frames tight spread as regular and wide spread as varied", () => {
    expect(regularityCopy(2)).toContain("regular")
    expect(regularityCopy(5)).toContain("fairly regular")
    expect(regularityCopy(9)).toContain("varied")
  })
})

describe("phaseCorrelations", () => {
  it("groups logs into phases by their day in the cycle", () => {
    const cycles = [cycle("c1", "2026-06-01", "2026-06-27")]
    const logs = [
      // Day 2 → menstrual
      log("2026-06-02", ["cramps"], "tired"),
      // Day 10 → follicular (ovulation day 14, window starts day 11)
      log("2026-06-10", ["headache"]),
      // Day 13 → ovulation window (11..15)
      log("2026-06-13", ["bloating"], "happy"),
      // Day 20 → luteal
      log("2026-06-20", ["cramps"], "irritable"),
      // Outside the cycle → ignored
      log("2026-05-01", ["cramps"]),
    ]

    const result = phaseCorrelations(cycles, logs, config)

    expect(result.menstrual.symptoms[0]).toEqual(["cramps", 1])
    expect(result.follicular.symptoms[0]).toEqual(["headache", 1])
    expect(result.ovulation.symptoms[0]).toEqual(["bloating", 1])
    expect(result.ovulation.moods[0]).toEqual(["happy", 1])
    expect(result.luteal.symptoms[0]).toEqual(["cramps", 1])
    expect(result.luteal.moods[0]).toEqual(["irritable", 1])
  })

  it("accumulates counts across multiple logs in the same phase", () => {
    const cycles = [cycle("c1", "2026-06-01", "2026-06-27")]
    const logs = [
      log("2026-06-02", ["cramps"]),
      log("2026-06-03", ["cramps", "bloating"]),
    ]

    const result = phaseCorrelations(cycles, logs, config)

    expect(result.menstrual.symptoms[0]).toEqual(["cramps", 2])
    expect(result.menstrual.symptoms[1]).toEqual(["bloating", 1])
  })

  it("returns empty tallies with no cycles", () => {
    const result = phaseCorrelations([], [log("2026-06-02", ["cramps"])], config)

    expect(Object.values(result).every((p) => p.symptoms.length === 0)).toBe(true)
  })
})
