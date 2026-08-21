import { useCallback, useEffect, useRef } from "react"
import { useSelector } from "@xstate/store-react"
import {
  syncStore,
  createNewRepo,
  configureExistingRepo,
  syncNowAction,
  disconnectAction,
  refreshSyncIdentity,
  loadSyncConfig,
  loadSyncStatus,
} from "@/stores/sync-store"
import { authStore, connectDeviceFlow } from "@/stores/auth-store"
import { onSyncStatusChanged } from "@/services/sync"

export function useSync() {
  const state = useSelector(syncStore, (s) => s.context)
  const deviceFlow = useSelector(authStore, (s) => s.context.deviceFlow)
  const connecting = useSelector(authStore, (s) => s.context.connecting)
  const authError = useSelector(authStore, (s) => s.context.error)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    loadSyncConfig()
    loadSyncStatus()
    // Background syncs persist status natively; the event covers syncs that
    // run while the app is open, and foregrounding reloads the rest.
    const unsubscribe = onSyncStatusChanged((status) => {
      syncStore.send({ type: "setStatus", status })
    })
    return () => {
      cancelledRef.current = true
      unsubscribe()
    }
  }, [])

  const clearAuthError = useCallback(() => {
    authStore.send({ type: "setError", error: null })
  }, [])

  const connect = useCallback(async () => {
    const authorized = await connectDeviceFlow(() => cancelledRef.current)
    if (authorized) await refreshSyncIdentity()
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectAction()
    authStore.send({ type: "reset" })
  }, [])

  const createRepo = useCallback(
    async (name: string) => {
      clearAuthError()
      await createNewRepo(name)
    },
    [clearAuthError],
  )

  const useRepo = useCallback(
    async (owner: string, repo: string) => {
      clearAuthError()
      await configureExistingRepo(owner, repo)
    },
    [clearAuthError],
  )

  const syncNow = useCallback(async () => {
    clearAuthError()
    await syncNowAction()
  }, [clearAuthError])

  return {
    ...state,
    deviceFlow,
    connecting,
    error: authError ?? state.error,
    connected: state.username !== null,
    connect,
    createNewRepo: createRepo,
    useExistingRepo: useRepo,
    syncNow,
    disconnect,
    refresh: refreshSyncIdentity,
  }
}
