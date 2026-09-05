import { useEffect } from "react"
import { refreshWidget } from "@/services/widget"
import { logger } from "@/services/logger"
import { usePrediction } from "@/hooks/use-predictions"
import { useSettings } from "@/hooks/use-settings"

export function useWidget() {
  const prediction = usePrediction().prediction
  const { discreetMode } = useSettings()

  useEffect(() => {
    // A completed prediction has already persisted its localized snapshot.
    // Widget rendering must never feed back into prediction computation.
    void refreshWidget().catch((error) => logger.warn("widget", "Refresh failed", error))
  }, [prediction, discreetMode])
}
