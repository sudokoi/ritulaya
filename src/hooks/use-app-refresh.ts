import { useEffect } from "react"
import { AppState } from "react-native"
import { refreshAll } from "@/data/refresh"
import { loadSyncStatus } from "@/stores/sync-store"

export function useAppRefresh() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return
      void refreshAll()
      void loadSyncStatus()
    })
    return () => subscription.remove()
  }, [])
}
