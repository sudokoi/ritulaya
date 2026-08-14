export interface SyncConfig {
  repoOwner: string
  repoName: string
  branch: string
}

export interface SyncStatus {
  syncedAt: string | null
  warning: boolean
  consecutiveFailures: number
  status: "idle" | "syncing" | "inSync" | "error"
}
