import type {
  PredictionResult,
  PredictionStrategy,
  PredictionConfig,
} from "@/types/prediction"

export function createWMAPredictor(): PredictionStrategy {
  return {
    predict(cycles, config) {
      const completedCycles = cycles
        .filter((c) => c.endDate !== null)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

      if (completedCycles.length < 1) {
        return populationFallback(config)
      }

      const cycleLengths = completedCycles.map((c) => {
        const start = new Date(c.startDate)
        const end = new Date(c.endDate ?? c.startDate)
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      })

      const avgCycleLength = weightedMovingAverage(
        cycleLengths,
        config.avgCycleLength,
        completedCycles.length,
      )

      const lastCycle = completedCycles[0]
      const lastCycleStart = new Date(lastCycle.startDate)

      const nextPeriodStart = new Date(lastCycleStart)
      nextPeriodStart.setDate(nextPeriodStart.getDate() + avgCycleLength)

      const nextPeriodEnd = new Date(nextPeriodStart)
      nextPeriodEnd.setDate(nextPeriodEnd.getDate() + config.avgPeriodLength - 1)

      const ovulationDay = new Date(nextPeriodStart)
      ovulationDay.setDate(ovulationDay.getDate() - config.lutealPhaseLength)

      const fertileStart = new Date(ovulationDay)
      fertileStart.setDate(fertileStart.getDate() - 3)
      const fertileEnd = new Date(ovulationDay)
      fertileEnd.setDate(fertileEnd.getDate() + 1)

      return {
        nextPeriodStart,
        nextPeriodEnd,
        ovulationDay,
        fertileWindow: { start: fertileStart, end: fertileEnd },
        confidence: confidenceScore(completedCycles.length),
        cyclesUsed: completedCycles.length,
        engine: "wma" as const,
      }
    },
  }
}

function weightedMovingAverage(
  lengths: number[],
  fallback: number,
  count: number,
): number {
  if (count < 2) return fallback

  const weights: number[] = []
  if (count === 2) {
    weights.push(0.6, 0.4)
  } else if (count === 3) {
    weights.push(0.5, 0.3, 0.2)
  } else {
    let total = 0
    for (let i = 0; i < count; i++) {
      const w = 1 / (i + 1)
      weights.push(w)
      total += w
    }
    for (let i = 0; i < weights.length; i++) {
      weights[i] = weights[i] / total
    }
  }

  let sum = 0
  for (let i = 0; i < Math.min(lengths.length, weights.length); i++) {
    sum += lengths[i] * weights[i]
  }

  return Math.round(sum)
}

function confidenceScore(cyclesCount: number): number {
  if (cyclesCount >= 6) return 0.95
  if (cyclesCount >= 4) return 0.85
  if (cyclesCount >= 3) return 0.7
  if (cyclesCount >= 2) return 0.5
  return 0.3
}

function populationFallback(config: PredictionConfig): PredictionResult {
  const today = new Date()
  const nextPeriodStart = new Date(today)
  nextPeriodStart.setDate(nextPeriodStart.getDate() + (config.avgCycleLength - 1))

  const nextPeriodEnd = new Date(nextPeriodStart)
  nextPeriodEnd.setDate(nextPeriodEnd.getDate() + config.avgPeriodLength - 1)

  const ovulationDay = new Date(nextPeriodStart)
  ovulationDay.setDate(ovulationDay.getDate() - config.lutealPhaseLength)

  const fertileStart = new Date(ovulationDay)
  fertileStart.setDate(fertileStart.getDate() - 3)
  const fertileEnd = new Date(ovulationDay)
  fertileEnd.setDate(fertileEnd.getDate() + 1)

  return {
    nextPeriodStart,
    nextPeriodEnd,
    ovulationDay,
    fertileWindow: { start: fertileStart, end: fertileEnd },
    confidence: 0.3,
    cyclesUsed: 0,
    engine: "wma",
  }
}
