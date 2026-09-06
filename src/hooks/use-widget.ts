import { useEffect } from "react"
import { refreshWidget } from "@/services/widget"
import { logger } from "@/services/logger"
import { useSelector } from "@xstate/store-react"
import { dataStore } from "@/stores/data-store"
import { useSettings } from "@/hooks/use-settings"

export function useWidget() {
  const bundle = useSelector(dataStore, (state) => state.context.prediction)
  const refreshFailed = useSelector(dataStore, (state) => state.context.refreshFailed)
  const pending = useSelector(
    dataStore,
    (state) => state.context.refreshing || state.context.settingsWrites > 0,
  )
  const { discreetMode } = useSettings()

  useEffect(() => {
    if (refreshFailed || pending) return
    // A completed prediction has already persisted its localized snapshot.
    // Widget rendering must never feed back into prediction computation.
    void refreshWidget().catch((error) => logger.warn("widget", "Refresh failed", error))
  }, [bundle, discreetMode, refreshFailed, pending])
}
