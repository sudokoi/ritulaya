import RitulayaSync from "../../modules/ritulaya-sync"
import { GITHUB_OAUTH_CLIENT_ID } from "@/constants/app-config"

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

export async function initiateDeviceFlow() {
  if (!RitulayaSync) throw new Error("Sync is not available on this device")
  return RitulayaSync.initiateDeviceFlow(GITHUB_OAUTH_CLIENT_ID)
}

export async function pollForToken(isCancelled?: () => boolean): Promise<string | null> {
  if (!RitulayaSync) return null

  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    if (isCancelled?.()) return null

    const result = await RitulayaSync.pollOnce(GITHUB_OAUTH_CLIENT_ID)
    if (result?.status === "granted") return result.token ?? null
    if (result?.status === "error") return null

    await sleep(result?.status === "slow_down" ? SLOW_DOWN_MS : POLL_INTERVAL_MS)
  }

  return null
}

export async function getUsername() {
  if (!RitulayaSync) return null
  return RitulayaSync.getUsername()
}

export async function listRepos(): Promise<RepoInfo[]> {
  if (!RitulayaSync) return []
  const repos = await RitulayaSync.listRepos()
  return repos ?? []
}

export async function createRepo(name: string) {
  if (!RitulayaSync) throw new Error("Sync is not available on this device")
  await RitulayaSync.createRepo(name)
}

export async function configureRepo(owner: string, repo: string, branch: string) {
  if (!RitulayaSync) return
  await RitulayaSync.configureRepo(owner, repo, branch)
}

export async function getConfig() {
  if (!RitulayaSync) return null
  return RitulayaSync.getConfig()
}

export async function syncNow() {
  if (!RitulayaSync) return null
  return RitulayaSync.syncNow()
}

export async function scheduleBackgroundSync(intervalMinutes: number) {
  if (!RitulayaSync) return
  await RitulayaSync.scheduleBackgroundSync(intervalMinutes)
}

export async function getSyncStatus() {
  if (!RitulayaSync) return null
  return RitulayaSync.getSyncStatus()
}

export async function disconnect() {
  if (!RitulayaSync) return
  await RitulayaSync.disconnect()
}
