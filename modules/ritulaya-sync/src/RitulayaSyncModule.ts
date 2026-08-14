import { requireOptionalNativeModule } from "expo"
import type { SyncStatus } from "@/types/sync"

export interface DeviceFlowResult {
  userCode: string
  verificationUrl: string
}

export interface PollResult {
  token: string | null
  status: "granted" | "pending" | "slow_down" | "error"
}

export interface SyncConfig {
  repoOwner: string
  repoName: string
  branch: string
}

interface RitulayaSyncNativeModule {
  initiateDeviceFlow(clientId: string): Promise<DeviceFlowResult>
  pollOnce(clientId: string): Promise<PollResult>
  disconnect(): Promise<void>
  getUsername(): Promise<string | null>
  listRepos(): Promise<{ name: string; private: boolean }[] | null>
  createRepo(name: string): Promise<void>
  configureRepo(owner: string, repo: string, branch: string): Promise<void>
  getConfig(): Promise<SyncConfig | null>
  syncNow(): Promise<SyncStatus>
  scheduleBackgroundSync(intervalMinutes: number): Promise<void>
  getSyncStatus(): Promise<SyncStatus>
  addListener(event: "syncStatusChanged" | "syncConflictDetected"): void
  removeListeners(count: number): void
}

export default requireOptionalNativeModule<RitulayaSyncNativeModule>("RitulayaSync")
