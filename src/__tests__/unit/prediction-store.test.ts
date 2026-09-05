jest.mock("@/services/db", () => ({}))
jest.mock("@/services/logger", () => ({ logger: { warn: jest.fn() } }))
jest.mock("@/i18n", () => ({ changeLanguage: jest.fn().mockResolvedValue(undefined) }))
jest.mock("@/services/predictions", () => ({ computePrediction: jest.fn() }))
jest.mock("@/lib/native", () => ({
  native: { db: {} },
  nativeCall: jest.fn().mockResolvedValue(""),
}))

import { cycleStore } from "@/stores/cycle-store"
import { dayLogStore } from "@/stores/day-log-store"
import { settingsStore } from "@/stores/settings-store"
import { computePrediction } from "@/services/predictions"
import { recomputePrediction } from "@/stores/prediction-store"

const bundle = {
  prediction: null,
  periodLength: 3,
  avgCycleLength: 28,
  phase: "follicular" as const,
  stats: null,
}

test("does not compute from unhydrated inputs", async () => {
  await recomputePrediction()
  expect(computePrediction).not.toHaveBeenCalled()
})

test("concurrent callers await the pending recomputation, not just the first result", async () => {
  let finish!: () => void
  jest
    .mocked(computePrediction)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = () => resolve(bundle)
      }),
    )
    .mockResolvedValue(bundle)
  cycleStore.send({ type: "setCycles", cycles: [], currentCycle: null })
  dayLogStore.send({ type: "setLogs", logs: [] })
  settingsStore.send({ type: "patch", settings: { loaded: true } })
  const first = recomputePrediction()
  const second = recomputePrediction()
  expect(second).toBe(first)
  await Promise.resolve()
  await Promise.resolve()
  finish()
  await second
  expect(computePrediction).toHaveBeenCalledTimes(2)
})

test("a missing prediction bundle rejects completion and a later call can retry", async () => {
  jest
    .mocked(computePrediction)
    .mockResolvedValueOnce(null as never)
    .mockResolvedValue(bundle)
  await expect(recomputePrediction()).rejects.toThrow("did not complete")
  await expect(recomputePrediction()).resolves.toBeUndefined()
})
