jest.mock("@/services/db", () => ({
  findSettings: jest.fn(),
  updateSettings: jest.fn(),
}))

import { findSettings, updateSettings } from "@/services/db"
import { loadSettings, settingsStore, updateSettingsFn } from "@/stores/settings-store"

beforeEach(() => jest.clearAllMocks())

test("settings load errors reject instead of making defaults look ready", async () => {
  jest.mocked(findSettings).mockRejectedValueOnce(new Error("locked database"))
  await expect(loadSettings()).rejects.toThrow("locked database")
})

test("failed settings writes reject and preserve the cached value", async () => {
  const before = settingsStore.getSnapshot().context.theme
  jest.mocked(updateSettings).mockRejectedValueOnce(new Error("disk full"))
  await expect(updateSettingsFn({ theme: "dark" })).rejects.toThrow("disk full")
  expect(settingsStore.getSnapshot().context.theme).toBe(before)
})

test("writes send only changed fields, not stale security settings", async () => {
  jest.mocked(updateSettings).mockResolvedValueOnce(undefined)
  await updateSettingsFn({ theme: "dark" })
  expect(updateSettings).toHaveBeenCalledWith({ theme: "dark" })
})
