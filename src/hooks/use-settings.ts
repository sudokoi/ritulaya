import { useSelector } from "@xstate/store-react"
import { settingsStore, loadSettings, updateSettingsFn } from "@/stores/settings-store"

export function useSettings() {
  const settings = useSelector(settingsStore, (s) => s.context)

  return {
    ...settings,
    load: loadSettings,
    update: updateSettingsFn,
  }
}
