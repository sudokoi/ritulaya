import { useSelector } from "@xstate/store-react"
import { loadSettings, updateSettingsFn } from "@/stores/settings-store"
import { dataStore } from "@/stores/data-store"

export function useSettings() {
  const settings = useSelector(dataStore, (s) => s.context.settings)

  return {
    ...settings,
    load: loadSettings,
    update: updateSettingsFn,
  }
}
