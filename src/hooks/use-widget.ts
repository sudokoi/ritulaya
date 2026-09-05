import { useEffect } from "react"
import { refreshWidget } from "@/services/widget"
import { logger } from "@/services/logger"
import { useSelector } from "@xstate/store-react"
import { predictionStore } from "@/stores/prediction-store"
import { useSettings } from "@/hooks/use-settings"

export function useWidget() {
  const bundle = useSelector(predictionStore, (state) => state.context)
  const { discreetMode } = useSettings()

  useEffect(() => {
    // A completed prediction has already persisted its localized snapshot.
    // Widget rendering must never feed back into prediction computation.
    void refreshWidget().catch((error) => logger.warn("widget", "Refresh failed", error))
  }, [bundle, discreetMode])
}
