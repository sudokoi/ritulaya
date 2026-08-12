export interface SyncConfig {
  repoOwner: string
  repoName: string
  branch: string
  syncIntervalMinutes: number
}

export interface SyncStatus {
  syncedAt: string | null
  warning: boolean
  consecutiveFailures: number
  status: "idle" | "syncing" | "inSync" | "error"
}

export interface SyncConflict {
  conflictedRow: string
  localValue: Record<string, unknown>
  remoteValue: Record<string, unknown>
}
