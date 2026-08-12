import { requireOptionalNativeModule } from "expo"
import type { SyncStatus } from "@/types/sync"

export interface DeviceFlowResult {
  userCode: string
  verificationUrl: string
}

export interface SyncConfig {
  repoOwner: string
  repoName: string
  branch: string
}

interface RitulayaSyncNativeModule {
  initiateDeviceFlow(clientId: string): Promise<DeviceFlowResult>
  pollForToken(clientId: string): Promise<string | null>
  disconnect(): Promise<void>
  configureRepo(owner: string, repo: string, branch: string): Promise<void>
  getConfig(): Promise<SyncConfig | null>
  syncNow(): Promise<SyncStatus>
  scheduleBackgroundSync(intervalMinutes: number): Promise<void>
  getSyncStatus(): Promise<SyncStatus>
  addListener(event: "syncStatusChanged" | "syncConflictDetected"): void
  removeListeners(count: number): void
}

export default requireOptionalNativeModule<RitulayaSyncNativeModule>("RitulayaSync")
