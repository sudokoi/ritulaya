import RitulayaSync from "../../modules/ritulaya-sync"
import { GITHUB_OAUTH_CLIENT_ID } from "@/constants/app-config"

export interface RepoInfo {
  name: string
  private: boolean
}

export async function initiateDeviceFlow() {
  if (!RitulayaSync) throw new Error("Sync is not available on this device")
  return RitulayaSync.initiateDeviceFlow(GITHUB_OAUTH_CLIENT_ID)
}

export async function pollForToken() {
  if (!RitulayaSync) return null
  return RitulayaSync.pollForToken(GITHUB_OAUTH_CLIENT_ID)
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

export async function getSyncStatus() {
  if (!RitulayaSync) return null
  return RitulayaSync.getSyncStatus()
}

export async function disconnect() {
  if (!RitulayaSync) return
  await RitulayaSync.disconnect()
}
