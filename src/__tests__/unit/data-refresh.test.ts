jest.mock("@/services/db", () => ({ readAppSnapshot: jest.fn() }))
jest.mock("@/i18n", () => ({ changeLanguage: jest.fn().mockResolvedValue(undefined) }))
jest.mock("@/services/predictions", () => ({ computePrediction: jest.fn() }))
jest.mock("@/services/notifications", () => ({
  blockReminders: jest.fn().mockResolvedValue(undefined),
  allowReminders: jest.fn(),
}))

import { readAppSnapshot } from "@/services/db"
import { computePrediction } from "@/services/predictions"
import { dataStore } from "@/stores/data-store"
import { refreshAll } from "@/data/refresh"
import { blockReminders } from "@/services/notifications"

const bundle = {
  prediction: null,
  periodLength: 3,
  avgCycleLength: 28,
  phase: "follicular" as const,
  stats: null,
}
const snapshot = { cycles: [], logs: [], settings: null, dataVersion: "captured" }
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(readAppSnapshot).mockResolvedValue(snapshot)
  jest.mocked(computePrediction).mockResolvedValue(bundle)
})

test("capture failure never computes from partial or default caches", async () => {
  const before = dataStore.getSnapshot()
  jest.mocked(readAppSnapshot).mockRejectedValueOnce(new Error("locked database"))
  await expect(refreshAll()).rejects.toThrow("locked database")
  expect(computePrediction).not.toHaveBeenCalled()
  expect(dataStore.getSnapshot().context.version).toBe(before.context.version)
  expect(dataStore.getSnapshot().context.settings).toBe(before.context.settings)
})

test("overlapping refreshes discard intermediate results and publish one coherent version", async () => {
  let finish!: () => void
  let started!: () => void
  const computing = new Promise<void>((resolve) => {
    started = resolve
  })
  jest
    .mocked(computePrediction)
    .mockImplementationOnce(() => {
      started()
      return new Promise((resolve) => {
        finish = () => resolve(bundle)
      })
    })
    .mockResolvedValue({ ...bundle, avgCycleLength: 31 })
  const published: number[] = []
  let version = dataStore.getSnapshot().context.version
  const subscription = dataStore.subscribe((state) => {
    if (state.context.version !== version)
      published.push(state.context.prediction.avgCycleLength)
    version = state.context.version
  })
  const before = dataStore.getSnapshot()
  const first = refreshAll()
  await computing
  expect(dataStore.getSnapshot().context.version).toBe(before.context.version)
  const second = refreshAll()
  expect(second).toBe(first)
  finish()
  await second
  expect(published).toEqual([31])
  expect(dataStore.getSnapshot().context.version).toBe(before.context.version + 1)
  expect(computePrediction).toHaveBeenLastCalledWith(
    [],
    [],
    expect.objectContaining({ dataVersion: "captured" }),
  )
  subscription.unsubscribe()
})

test("failed prediction retains the complete previous snapshot and can retry", async () => {
  const before = dataStore.getSnapshot()
  jest.mocked(computePrediction).mockResolvedValueOnce(null as never)
  await expect(refreshAll()).rejects.toThrow("did not complete")
  expect(dataStore.getSnapshot().context.version).toBe(before.context.version)
  expect(dataStore.getSnapshot().context.prediction).toBe(before.context.prediction)
  expect(blockReminders).not.toHaveBeenCalled()
  await expect(refreshAll()).resolves.toBeUndefined()
})
