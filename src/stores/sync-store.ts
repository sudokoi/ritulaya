import { createStore } from "@xstate/store"
import {
  getConfig,
  getSyncStatus,
  getUsername,
  listRepos,
  type RepoInfo,
} from "@/services/sync"
import type { SyncConfig, SyncStatus } from "@/types/sync"

interface SyncStoreState {
  config: SyncConfig | null
  status: SyncStatus | null
  username: string | null
  repos: RepoInfo[]
}

export const syncStore = createStore({
  context: {
    config: null as SyncConfig | null,
    status: null as SyncStatus | null,
    username: null as string | null,
    repos: [] as RepoInfo[],
  } as SyncStoreState,
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
    reset: () => ({
      config: null,
      status: null,
      username: null,
      repos: [],
    }),
  },
})

export async function loadSyncConfig() {
  const config = await getConfig()
  syncStore.send({ type: "setConfig", config })
  if (config) {
    const username = await getUsername()
    const repos = await listRepos()
    syncStore.send({ type: "setIdentity", username, repos })
  }
}

export async function loadSyncStatus() {
  const status = await getSyncStatus()
  syncStore.send({ type: "setStatus", status })
}

export async function refreshSyncIdentity() {
  const username = await getUsername()
  const repos = await listRepos()
  syncStore.send({ type: "setIdentity", username, repos })
}

export function resetSyncStore() {
  syncStore.send({ type: "reset" })
}
