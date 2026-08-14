import { useCallback, useEffect, useState } from "react"
import { useSelector } from "@xstate/store-react"
import {
  syncNow as syncNowService,
  disconnect as disconnectService,
} from "@/services/sync"
import { syncStore, loadSyncStatus, resetSyncStore } from "@/stores/sync-store"
import { loadDayLogs } from "@/stores/day-log-store"
import { loadCycles } from "@/stores/cycle-store"

export function useSyncStatus() {
  const status = useSelector(syncStore, (s) => s.context.status)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSyncStatus()
  }, [])

  const syncNow = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const result = await syncNowService()
      if (result?.status === "inSync") {
        await loadDayLogs()
        loadCycles()
      }
      await loadSyncStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectService()
    resetSyncStore()
  }, [])

  return { status, syncing, error, syncNow, disconnect }
}
