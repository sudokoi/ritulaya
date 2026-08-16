import { useEffect } from "react"
import { AppState } from "react-native"
import { loadCycles } from "@/stores/cycle-store"
import { loadDayLogs } from "@/stores/day-log-store"
import { loadSettings } from "@/stores/settings-store"
import { loadSyncStatus } from "@/stores/sync-store"

export function useAppRefresh() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return
      void loadCycles()
      void loadDayLogs()
      void loadSettings()
      void loadSyncStatus()
    })
    return () => subscription.remove()
  }, [])
}
