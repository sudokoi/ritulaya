import { useCallback, useEffect, useRef } from "react"
import { useSelector } from "@xstate/store-react"
import {
  syncStore,
  connectDeviceFlow,
  createNewRepo,
  useExistingRepo,
  syncNowAction,
  disconnectAction,
  refreshSyncIdentity,
  loadSyncConfig,
  loadSyncStatus,
} from "@/stores/sync-store"

export function useSync() {
  const state = useSelector(syncStore, (s) => s.context)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    loadSyncConfig()
    loadSyncStatus()
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const connect = useCallback(async () => {
    const authorized = await connectDeviceFlow(() => cancelledRef.current)
    if (authorized) await refreshSyncIdentity()
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectAction()
  }, [])

  return {
    ...state,
    connected: state.username !== null,
    connect,
    createNewRepo,
    useExistingRepo,
    syncNow: syncNowAction,
    disconnect,
    refresh: refreshSyncIdentity,
  }
}
