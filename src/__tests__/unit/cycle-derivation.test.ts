import { deriveCycleDays, fertileFractions } from "@/lib/cycle-derivation"
import type { PredictionResult } from "@/types/prediction"

function day(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d)
}

function makePrediction(overrides: Partial<PredictionResult> = {}): PredictionResult {
  return {
    nextPeriodStart: day(2026, 8, 1),
    nextPeriodEnd: day(2026, 8, 4),
    ovulationDay: day(2026, 8, 14),
    fertileWindow: { start: day(2026, 8, 11), end: day(2026, 8, 15) },
    uncertaintyWindow: { start: day(2026, 7, 30), end: day(2026, 8, 3) },
    confidence: 0.9,
    cyclesUsed: 3,
    engine: "wma",
    ...overrides,
  }
}

describe("deriveCycleDays", () => {
  it("returns only the recorded flow days when there is no prediction", () => {
    const result = deriveCycleDays(null, ["2026-08-02"])

    expect(result.periodDays).toEqual(["2026-08-02"])
    expect(result.predictedDays).toEqual([])
    expect(result.fertileDays).toEqual([])
    expect(result.ovulationDays).toEqual([])
  })

  it("projects a single cycle by default (horizon is next period end)", () => {
    const result = deriveCycleDays(makePrediction(), [], { avgCycleLength: 28 })

    expect(result.predictedDays).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
    ])
    expect(result.ovulationDays).toEqual(["2026-08-14"])
    expect(result.fertileDays.map((f) => f.date)).toEqual([
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
    ])
  })

  it("ramps fertile intensity from 0.25 to 0.75 across the window", () => {
    const result = deriveCycleDays(makePrediction(), [], { avgCycleLength: 28 })

    expect(result.fertileDays.map((f) => f.fraction)).toEqual([
      0.25, 0.375, 0.5, 0.625, 0.75,
    ])
  })

  it("marks a single-day fertile window at 0.5", () => {
    const prediction = makePrediction({
      ovulationDay: day(2026, 8, 6),
      fertileWindow: { start: day(2026, 8, 6), end: day(2026, 8, 6) },
    })
    const result = deriveCycleDays(prediction, [], {
      avgCycleLength: 7,
      throughDate: day(2026, 8, 20),
    })

    expect(result.fertileDays).toEqual([
      { date: "2026-08-06", fraction: 0.5 },
      { date: "2026-08-13", fraction: 0.5 },
      { date: "2026-08-20", fraction: 0.5 },
    ])
  })

  it("repeats the prediction every avg cycle length through the horizon", () => {
    const prediction = makePrediction({
      nextPeriodStart: day(2026, 8, 1),
      nextPeriodEnd: day(2026, 8, 2),
      ovulationDay: day(2026, 8, 6),
    })
    const result = deriveCycleDays(prediction, [], {
      avgCycleLength: 7,
      throughDate: day(2026, 8, 16),
    })

    expect(result.predictedDays).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-08",
      "2026-08-09",
      "2026-08-15",
      "2026-08-16",
    ])
    expect(result.ovulationDays).toEqual(["2026-08-06", "2026-08-13", "2026-08-20"])
  })

  it("clips a predicted period at the horizon instead of leaking past it", () => {
    const prediction = makePrediction({
      nextPeriodStart: day(2026, 8, 5),
      nextPeriodEnd: day(2026, 8, 9),
    })
    const result = deriveCycleDays(prediction, [], {
      avgCycleLength: 28,
      throughDate: day(2026, 8, 8),
    })

    expect(result.predictedDays).toEqual([
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
    ])
  })

  it("clamps a degenerate cycle length so recurrence stays finite", () => {
    const prediction = makePrediction()
    const result = deriveCycleDays(prediction, [], {
      avgCycleLength: 0,
      throughDate: day(2026, 8, 6),
    })

    expect(result.predictedDays.length).toBeGreaterThan(0)
    expect(result.predictedDays[0]).toBe("2026-08-01")
  })
})

describe("fertileFractions", () => {
  it("indexes fertile days by date", () => {
    const map = fertileFractions([
      { date: "2026-08-11", fraction: 0.25 },
      { date: "2026-08-12", fraction: 0.5 },
    ])

    expect(map.get("2026-08-11")).toBe(0.25)
    expect(map.get("2026-08-12")).toBe(0.5)
    expect(map.has("2026-08-13")).toBe(false)
  })
})
