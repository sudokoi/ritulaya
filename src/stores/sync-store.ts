import { createStore } from "@xstate/store"
import {
  initiateDeviceFlow,
  pollForToken,
  getConfig,
  getSyncStatus,
  getUsername,
  listRepos,
  createRepo,
  configureRepo,
  syncNow,
  disconnect,
  scheduleBackgroundSync,
  type RepoInfo,
} from "@/services/sync"
import type { SyncConfig, SyncStatus } from "@/types/sync"
import { loadDayLogs } from "@/stores/day-log-store"
import { loadCycles } from "@/stores/cycle-store"
import { loadSettings } from "@/stores/settings-store"
import { logger } from "@/services/logger"

const SYNC_INTERVAL_MINUTES = 24 * 60

export interface DeviceFlowState {
  userCode: string
  verificationUrl: string
}

interface SyncStoreState {
  config: SyncConfig | null
  status: SyncStatus | null
  username: string | null
  repos: RepoInfo[]
  deviceFlow: DeviceFlowState | null
  connecting: boolean
  busy: boolean
  syncing: boolean
  error: string | null
}

const initialState: SyncStoreState = {
  config: null,
  status: null,
  username: null,
  repos: [],
  deviceFlow: null,
  connecting: false,
  busy: false,
  syncing: false,
  error: null,
}

export const syncStore = createStore({
  context: initialState,
  on: {
    setConfig: (ctx, event: { config: SyncConfig | null }) => ({
      ...ctx,
      config: event.config,
    }),
    setStatus: (ctx, event: { status: SyncStatus | null }) => ({
      ...ctx,
      status: event.status,
    }),
    setIdentity: (ctx, event: { username: string | null; repos: RepoInfo[] }) => ({
      ...ctx,
      username: event.username,
      repos: event.repos,
    }),
    setDeviceFlow: (ctx, event: { deviceFlow: DeviceFlowState | null }) => ({
      ...ctx,
      deviceFlow: event.deviceFlow,
    }),
    setConnecting: (ctx, event: { connecting: boolean }) => ({
      ...ctx,
      connecting: event.connecting,
    }),
    setBusy: (ctx, event: { busy: boolean }) => ({ ...ctx, busy: event.busy }),
    setSyncing: (ctx, event: { syncing: boolean }) => ({
      ...ctx,
      syncing: event.syncing,
    }),
    setError: (ctx, event: { error: string | null }) => ({ ...ctx, error: event.error }),
    reset: () => ({ ...initialState }),
  },
})

export async function loadSyncConfig() {
  const config = await getConfig()
  syncStore.send({ type: "setConfig", config })
  if (config) {
    const [username, repos] = await Promise.all([getUsername(), listRepos()])
    syncStore.send({ type: "setIdentity", username, repos })
  }
}

export async function loadSyncStatus() {
  const status = await getSyncStatus()
  syncStore.send({ type: "setStatus", status })
}

export async function refreshSyncIdentity() {
  const [username, repos] = await Promise.all([getUsername(), listRepos()])
  syncStore.send({ type: "setIdentity", username, repos })
}

export async function connectDeviceFlow(isCancelled: () => boolean): Promise<boolean> {
  syncStore.send({ type: "setError", error: null })
  syncStore.send({ type: "setConnecting", connecting: true })
  try {
    const flow = await initiateDeviceFlow()
    syncStore.send({ type: "setDeviceFlow", deviceFlow: flow })
    const token = await pollForToken(isCancelled)
    syncStore.send({ type: "setDeviceFlow", deviceFlow: null })
    if (!token) {
      if (!isCancelled()) {
        syncStore.send({
          type: "setError",
          error: "Authorization timed out. Please try again.",
        })
      }
      return false
    }
    return true
  } catch (e) {
    syncStore.send({ type: "setDeviceFlow", deviceFlow: null })
    syncStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "Failed to connect to GitHub",
    })
    logger.error("sync:device-flow", "GitHub device flow failed", e)
    return false
  } finally {
    syncStore.send({ type: "setConnecting", connecting: false })
  }
}

export async function createNewRepo(name: string) {
  syncStore.send({ type: "setBusy", busy: true })
  syncStore.send({ type: "setError", error: null })
  try {
    await createRepo(name)
    const username = syncStore.getSnapshot().context.username
    await configureRepo(username ?? "", name, "main")
    await scheduleBackgroundSync(SYNC_INTERVAL_MINUTES)
    await loadSyncConfig()
  } catch (e) {
    syncStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "Failed to create repository",
    })
    logger.error("sync:repo", "Failed to create repository", e)
  } finally {
    syncStore.send({ type: "setBusy", busy: false })
  }
}

export async function useExistingRepo(owner: string, repo: string) {
  syncStore.send({ type: "setBusy", busy: true })
  syncStore.send({ type: "setError", error: null })
  try {
    await configureRepo(owner, repo, "main")
    await scheduleBackgroundSync(SYNC_INTERVAL_MINUTES)
    await loadSyncConfig()
  } catch (e) {
    syncStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "Failed to configure repository",
    })
    logger.error("sync:repo", "Failed to configure repository", e)
  } finally {
    syncStore.send({ type: "setBusy", busy: false })
  }
}

export async function syncNowAction() {
  syncStore.send({ type: "setSyncing", syncing: true })
  syncStore.send({ type: "setError", error: null })
  try {
    const result = await syncNow()
    if (result?.status === "inSync") {
      await Promise.all([loadDayLogs(), loadCycles(), loadSettings()])
    }
    await loadSyncStatus()
  } catch (e) {
    syncStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "Sync failed",
    })
    logger.error("sync:status", "Sync failed", e)
  } finally {
    syncStore.send({ type: "setSyncing", syncing: false })
  }
}

export async function disconnectAction() {
  await disconnect()
  syncStore.send({ type: "reset" })
}
