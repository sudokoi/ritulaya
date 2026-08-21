import { useEffect } from "react"
import { AppState } from "react-native"
import { refreshAll } from "@/data/refresh"
import { loadSyncStatus } from "@/stores/sync-store"
import { logger } from "@/services/logger"

export function useAppRefresh() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return
      refreshAll().catch((e) => logger.warn("app", "Refresh failed", e))
      loadSyncStatus().catch((e) => logger.warn("app", "Sync status refresh failed", e))
    })
    return () => subscription.remove()
  }, [])
}
