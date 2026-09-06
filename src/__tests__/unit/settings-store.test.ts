jest.mock("@/services/db", () => ({
  findSettings: jest.fn(),
  updateSettings: jest.fn(),
}))
jest.mock("@/services/capture-protection", () => ({
  setCaptureProtected: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/services/notifications", () => ({
  blockReminders: jest.fn().mockResolvedValue(undefined),
  allowReminders: jest.fn(),
}))

import { updateSettings } from "@/services/db"
import { loadSettings, updateSettingsFn } from "@/stores/settings-store"
import { dataStore } from "@/stores/data-store"
import { setCaptureProtected } from "@/services/capture-protection"
import { blockReminders, allowReminders } from "@/services/notifications"
jest.mock("@/data/refresh", () => ({ refreshAll: jest.fn() }))

beforeEach(() => {
  jest.clearAllMocks()
  dataStore.send({ type: "publish", snapshot: dataStore.getSnapshot().context })
})

test("privacy writes wait for protection and cancel stale reminders before persistence", async () => {
  let finish!: () => void
  jest.mocked(setCaptureProtected).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  jest.mocked(loadSettings).mockRejectedValueOnce(new Error("prediction unavailable"))
  const command = updateSettingsFn({ discreetMode: true })
  expect(dataStore.getSnapshot().context.settingsWrites).toBe(1)
  expect(updateSettings).not.toHaveBeenCalled()
  finish()
  await expect(command).rejects.toThrow("prediction unavailable")
  expect(jest.mocked(blockReminders).mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(updateSettings).mock.invocationCallOrder[0],
  )
  expect(allowReminders).not.toHaveBeenCalled()
  expect(dataStore.getSnapshot().context.refreshFailed).toBe(true)
  expect(dataStore.getSnapshot().context.settingsWrites).toBe(0)
})

test("settings load errors reject instead of making defaults look ready", async () => {
  jest.mocked(loadSettings).mockRejectedValueOnce(new Error("locked database"))
  await expect(loadSettings()).rejects.toThrow("locked database")
})

test("failed settings writes reject and preserve the cached value", async () => {
  const before = dataStore.getSnapshot().context.settings.theme
  jest.mocked(updateSettings).mockRejectedValueOnce(new Error("disk full"))
  await expect(updateSettingsFn({ theme: "dark" })).rejects.toThrow("disk full")
  expect(dataStore.getSnapshot().context.settings.theme).toBe(before)
  expect(loadSettings).not.toHaveBeenCalled()
})

test("writes send only changed fields, not stale security settings", async () => {
  jest.mocked(updateSettings).mockResolvedValueOnce(undefined)
  await updateSettingsFn({ theme: "dark" })
  expect(updateSettings).toHaveBeenCalledWith({ theme: "dark" })
})
