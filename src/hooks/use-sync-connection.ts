import { useCallback, useEffect, useState } from "react"
import { useSelector } from "@xstate/store-react"
import { createRepo, configureRepo, scheduleBackgroundSync } from "@/services/sync"
import { syncStore, loadSyncConfig, refreshSyncIdentity } from "@/stores/sync-store"
import { logger } from "@/services/logger"

const SYNC_INTERVAL_MINUTES = 24 * 60

export function useSyncConnection() {
  const config = useSelector(syncStore, (s) => s.context.config)
  const username = useSelector(syncStore, (s) => s.context.username)
  const repos = useSelector(syncStore, (s) => s.context.repos)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSyncConfig()
  }, [])

  const createNewRepo = useCallback(
    async (name: string) => {
      setBusy(true)
      setError(null)
      try {
        await createRepo(name)
        await configureRepo(username ?? "", name, "main")
        await scheduleBackgroundSync(SYNC_INTERVAL_MINUTES)
        await loadSyncConfig()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create repository")
        logger.error("sync:repo", "Failed to create repository", e)
      } finally {
        setBusy(false)
      }
    },
    [username],
  )

  const useExistingRepo = useCallback(async (owner: string, repo: string) => {
    setBusy(true)
    setError(null)
    try {
      await configureRepo(owner, repo, "main")
      await scheduleBackgroundSync(SYNC_INTERVAL_MINUTES)
      await loadSyncConfig()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to configure repository")
      logger.error("sync:repo", "Failed to configure repository", e)
    } finally {
      setBusy(false)
    }
  }, [])

  return {
    config,
    username,
    repos,
    busy,
    error,
    connected: config !== null,
    refresh: refreshSyncIdentity,
    createNewRepo,
    useExistingRepo,
  }
}
