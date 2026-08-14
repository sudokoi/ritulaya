import { useCallback, useEffect, useState } from "react"
import {
  initiateDeviceFlow,
  pollForToken,
  getUsername,
  listRepos,
  createRepo,
  configureRepo,
  getConfig,
  syncNow,
  scheduleBackgroundSync,
  getSyncStatus,
  disconnect,
  type RepoInfo,
} from "@/services/sync"
import { loadDayLogs } from "@/stores/day-log-store"
import { useStoreActors } from "@/providers/store-provider"
import type { SyncConfig, SyncStatus } from "@/types/sync"

const SYNC_INTERVAL_MINUTES = 24 * 60

export function useSync() {
  const { cycleActor } = useStoreActors()
  const [config, setConfig] = useState<SyncConfig | null>(null)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [deviceFlow, setDeviceFlow] = useState<{
    userCode: string
    verificationUrl: string
  } | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [repos, setRepos] = useState<RepoInfo[]>([])
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [cfg, st] = await Promise.all([getConfig(), getSyncStatus()])
    setConfig(cfg)
    setStatus(st)
    if (cfg) {
      const user = await getUsername()
      setUsername(user)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const connect = useCallback(async () => {
    setError(null)
    setConnecting(true)
    try {
      const flow = await initiateDeviceFlow()
      setDeviceFlow(flow)

      const token = await pollForToken()
      setDeviceFlow(null)

      if (!token) {
        setError("Authorization timed out. Please try again.")
        return
      }

      const user = await getUsername()
      setUsername(user)
      const repoList = await listRepos()
      setRepos(repoList)
    } catch (e) {
      setDeviceFlow(null)
      setError(e instanceof Error ? e.message : "Failed to connect to GitHub")
    } finally {
      setConnecting(false)
    }
  }, [])

  const createNewRepo = useCallback(
    async (name: string) => {
      setBusy(true)
      setError(null)
      try {
        await createRepo(name)
        await configureRepo(username ?? "", name, "main")
        await scheduleBackgroundSync(SYNC_INTERVAL_MINUTES)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create repository")
      } finally {
        setBusy(false)
      }
    },
    [username, load],
  )

  const useExistingRepo = useCallback(
    async (owner: string, repo: string) => {
      setBusy(true)
      setError(null)
      try {
        await configureRepo(owner, repo, "main")
        await scheduleBackgroundSync(SYNC_INTERVAL_MINUTES)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to configure repository")
      } finally {
        setBusy(false)
      }
    },
    [load],
  )

  const syncNowAction = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const result = await syncNow()
      setStatus(result)
      if (result?.status === "inSync") {
        await loadDayLogs()
        cycleActor.send({ type: "load" })
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }, [load, cycleActor])

  const disconnectAction = useCallback(async () => {
    setBusy(true)
    try {
      await disconnect()
      setConfig(null)
      setStatus(null)
      setUsername(null)
      setRepos([])
    } finally {
      setBusy(false)
    }
  }, [])

  const connected = config !== null

  return {
    config,
    status,
    deviceFlow,
    username,
    repos,
    connecting,
    syncing,
    busy,
    error,
    connected,
    load,
    connect,
    createNewRepo,
    useExistingRepo,
    syncNow: syncNowAction,
    disconnect: disconnectAction,
  }
}
