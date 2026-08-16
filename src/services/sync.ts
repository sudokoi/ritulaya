import { native, nativeCall, nativeRequire } from "@/lib/native"
import { GITHUB_OAUTH_CLIENT_ID } from "@/constants/app-config"
import type { SyncStatus } from "@/types/sync"

const MAX_POLLS = 60
const POLL_INTERVAL_MS = 5000
const SLOW_DOWN_MS = 10000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface RepoInfo {
  name: string
  private: boolean
}

export function initiateDeviceFlow() {
  return nativeRequire(native.sync, (sync) =>
    sync.initiateDeviceFlow(GITHUB_OAUTH_CLIENT_ID),
  )
}

export async function pollForToken(isCancelled?: () => boolean): Promise<string | null> {
  return nativeCall(
    native.sync,
    async (sync) => {
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        if (isCancelled?.()) return null

        const result = await sync.pollOnce(GITHUB_OAUTH_CLIENT_ID)
        if (result?.status === "granted") return result.token ?? null
        if (result?.status === "error") return null

        await sleep(result?.status === "slow_down" ? SLOW_DOWN_MS : POLL_INTERVAL_MS)
      }

      return null
    },
    null,
  )
}

export function getUsername() {
  return nativeCall(native.sync, (sync) => sync.getUsername(), null)
}

export async function listRepos(): Promise<RepoInfo[]> {
  return nativeCall(native.sync, async (sync) => (await sync.listRepos()) ?? [], [])
}

export function createRepo(name: string) {
  return nativeRequire(native.sync, (sync) => sync.createRepo(name))
}

export function configureRepo(
  owner: string,
  repo: string,
  branch: string,
): Promise<void> {
  return nativeCall(
    native.sync,
    (sync) => sync.configureRepo(owner, repo, branch),
    undefined,
  )
}

export function getConfig() {
  return nativeCall(native.sync, (sync) => sync.getConfig(), null)
}

export function syncNow(): Promise<SyncStatus | null> {
  return nativeCall(native.sync, (sync) => sync.syncNow(), null as SyncStatus | null)
}

export function scheduleBackgroundSync(intervalMinutes: number): Promise<void> {
  return nativeCall(
    native.sync,
    (sync) => sync.scheduleBackgroundSync(intervalMinutes),
    undefined,
  )
}

export function getSyncStatus(): Promise<SyncStatus | null> {
  return nativeCall(
    native.sync,
    (sync) => sync.getSyncStatus(),
    null as SyncStatus | null,
  )
}

export function disconnect(): Promise<void> {
  return nativeCall(native.sync, (sync) => sync.disconnect(), undefined)
}
