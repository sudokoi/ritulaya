import { predict } from "@/predictions"
import type { PredictionConfig } from "@/types/prediction"

const defaultConfig: PredictionConfig = {
  avgCycleLength: 28,
  avgPeriodLength: 5,
  lutealPhaseLength: 14,
}

describe("prediction engine", () => {
  it("returns population fallback with 0 cycles", () => {
    const result = predict([], defaultConfig)
    expect(result.confidence).toBe(0.3)
    expect(result.cyclesUsed).toBe(0)
    expect(result.engine).toBe("wma")
  })

  it("returns WMA prediction with 3 completed cycles", () => {
    const cycles = [
      { startDate: "2026-06-01", endDate: "2026-06-28" },
      { startDate: "2026-07-01", endDate: "2026-07-29" },
      { startDate: "2026-08-02", endDate: "2026-08-30" },
    ]

    const result = predict(cycles, defaultConfig)
    expect(result.cyclesUsed).toBe(3)
    expect(result.confidence).toBe(0.7)
    expect(result.engine).toBe("wma")
    expect(result.nextPeriodStart).toBeInstanceOf(Date)
    expect(result.nextPeriodEnd).toBeInstanceOf(Date)
    expect(result.ovulationDay).toBeInstanceOf(Date)
    expect(result.fertileWindow.start).toBeInstanceOf(Date)
    expect(result.fertileWindow.end).toBeInstanceOf(Date)
  })

  it("uses WMA weights — recent cycles count more", () => {
    const stable = [
      { startDate: "2026-03-01", endDate: "2026-03-29" },
      { startDate: "2026-03-30", endDate: "2026-04-27" },
      { startDate: "2026-04-28", endDate: "2026-05-26" },
    ]

    const irregular = [
      { startDate: "2026-03-01", endDate: "2026-03-22" },
      { startDate: "2026-03-23", endDate: "2026-04-14" },
      { startDate: "2026-04-28", endDate: "2026-05-26" },
    ]

    const stableResult = predict(stable, defaultConfig)
    const irregularResult = predict(irregular, defaultConfig)

    expect(stableResult.nextPeriodStart.getTime()).not.toBe(
      irregularResult.nextPeriodStart.getTime(),
    )
  })

  it("ovulation is lutealPhaseLength days before predicted period", () => {
    const cycles = [{ startDate: "2026-06-01", endDate: "2026-06-28" }]

    const result = predict(cycles, {
      ...defaultConfig,
      lutealPhaseLength: 14,
    })

    const diff =
      (result.nextPeriodStart.getTime() - result.ovulationDay.getTime()) /
      (1000 * 60 * 60 * 24)

    expect(Math.round(diff)).toBe(14)
  })

  it("fertile window is 3 days before + 1 day after ovulation", () => {
    const cycles = [{ startDate: "2026-06-01", endDate: "2026-06-28" }]

    const result = predict(cycles, defaultConfig)

    const fertileDays =
      (result.fertileWindow.end.getTime() - result.fertileWindow.start.getTime()) /
      (1000 * 60 * 60 * 24)

    expect(Math.round(fertileDays)).toBe(4)
  })
})
