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
  actionRequired?: "migration" | "conflicts" | null
  errorCode?: "remoteChanged" | "github" | "invalidData" | null
}

export interface SyncReview {
  id: string
  kind: "migration" | "conflicts"
  conflicts: {
    id: string
    record: string
    field: string | null
    local: string | null
    remote: string | null
  }[]
}
