import { computePrediction } from "@/services/predictions"
import { native } from "@/lib/native"

jest.mock("@/lib/native", () => ({
  native: { predictions: { predict: jest.fn() } },
  nativeRequire: async (module: unknown, call: (module: unknown) => unknown) => {
    if (!module) throw new Error("Native module is not available on this device")
    return call(module)
  },
}))
jest.mock("@/i18n", () => ({ t: (key: string) => key }))

const predictionsModule = native.predictions
if (!predictionsModule) throw new Error("Missing test prediction module")
const config = {
  avgCycleLength: 28,
  avgPeriodLength: 3,
  lutealPhaseLength: 14,
  dataVersion: "",
}
const cycle = {
  id: "cycle",
  startDate: "2026-06-03",
  endDate: null,
  createdAt: "",
  updatedAt: "",
}
const result = {
  prediction: {
    nextPeriodStart: "2026-07-01",
    nextPeriodEnd: "2026-07-03",
    ovulationDay: "2026-06-17",
    fertileWindow: { start: "2026-06-12", end: "2026-06-18" },
    uncertaintyWindow: { start: "2026-06-28", end: "2026-07-04" },
    confidence: 0.2,
    cyclesUsed: 0,
    engine: "wma",
  },
  periodLength: 3,
  avgCycleLength: 28,
  phase: "follicular",
  stats: null,
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 5, 5, 12))
  native.predictions = predictionsModule
  jest.mocked(predictionsModule.predict).mockResolvedValue(result as never)
})
afterEach(() => {
  native.predictions = predictionsModule
  jest.useRealTimers()
})

test.each([
  { cycles: [] },
  { cycles: [{ ...cycle, endDate: "2026-06-04" }] },
  { cycles: [{ ...cycle, startDate: "2026-06-06" }] },
])("unanchored dates are not published for Calendar or reminders", async ({ cycles }) => {
  const bundle = await computePrediction(cycles, [], config)
  expect(bundle.prediction).toBeNull()
  expect(bundle.periodLength).toBe(3)
})

test("an established current cycle publishes its native dates", async () => {
  const bundle = await computePrediction([cycle], [], config)
  expect(bundle.prediction?.nextPeriodStart).toEqual(new Date(2026, 6, 1))
})

test("missing module or result rejects instead of opening protected routes", async () => {
  native.predictions = null
  await expect(computePrediction([], [], config)).rejects.toThrow("not available")
  native.predictions = predictionsModule
  jest.mocked(predictionsModule.predict).mockResolvedValueOnce(null as never)
  await expect(computePrediction([], [], config)).rejects.toThrow("no result")
})
