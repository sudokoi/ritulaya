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
        finish = () => resolve(null)
      }),
    )
    .mockResolvedValue(null)
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
