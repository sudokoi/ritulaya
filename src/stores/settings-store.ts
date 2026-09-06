import { updateSettings, type SettingsPatch } from "@/services/db"
import { dataStore } from "@/stores/data-store"
import { refreshAll } from "@/data/refresh"
import type { SettingsState } from "@/data/settings"
import { setCaptureProtected } from "@/services/capture-protection"
import { blockReminders, allowReminders } from "@/services/notifications"

export { refreshAll as loadSettings } from "@/data/refresh"
export type SettingsUpdate = Partial<Omit<SettingsState, "error" | "loaded">>

export async function updateSettingsFn(patch: SettingsUpdate) {
  dataStore.send({ type: "beginSettingsWrite" })
  try {
    // Protect before persistence, independently of prediction/cache completion.
    await setCaptureProtected(true)
    await blockReminders()
    const { biometricLock, discreetMode, reminderDailyLog, ...fields } = patch
    const data: SettingsPatch = { ...fields }
    if (biometricLock !== undefined) data.biometricLock = biometricLock ? 1 : 0
    if (discreetMode !== undefined) data.discreetMode = discreetMode ? 1 : 0
    if (reminderDailyLog !== undefined) data.reminderDailyLog = reminderDailyLog ? 1 : 0
    await updateSettings(data)
    await refreshAll()
  } catch (error) {
    dataStore.send({ type: "refreshFailed" })
    dataStore.send({
      type: "settingsError",
      error: error instanceof Error ? error.message : "Settings update failed",
    })
    throw error
  } finally {
    dataStore.send({ type: "endSettingsWrite" })
    const state = dataStore.getSnapshot().context
    if (!state.refreshFailed && state.settingsWrites === 0) allowReminders()
  }
}
