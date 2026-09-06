import { useEffect, useState } from "react"
import { View } from "react-native"
import { useTranslation } from "react-i18next"
import { useSettings } from "@/hooks/use-settings"
import { setCaptureProtected } from "@/services/capture-protection"
import { AppText } from "@/components/ui/text"
import { Button } from "@/components/ui/button"

import { CaptureReady } from "@/components/capture-policy-context"
import { useSelector } from "@xstate/store-react"
import { dataStore } from "@/stores/data-store"
import { refreshAll } from "@/data/refresh"

/** Hide routes and native dialogs while applying policy, without discarding drafts. */
export function CaptureGate({ children }: { children: React.ReactNode }) {
  const { biometricLock, discreetMode } = useSettings()
  const blocked = useSelector(
    dataStore,
    (state) =>
      state.context.refreshFailed ||
      state.context.refreshing ||
      state.context.settingsWrites > 0,
  )
  const protectedWindow = biometricLock || discreetMode || blocked
  return <CapturePolicy enabled={protectedWindow}>{children}</CapturePolicy>
}

function CapturePolicy({
  enabled,
  children,
}: {
  enabled: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const [result, setResult] = useState<{
    enabled: boolean
    status: "ready" | "failed"
  } | null>(null)
  const [initialized, setInitialized] = useState(false)
  const refreshFailed = useSelector(dataStore, (state) => state.context.refreshFailed)
  const settingsWrites = useSelector(dataStore, (state) => state.context.settingsWrites)
  const refreshing = useSelector(dataStore, (state) => state.context.refreshing)
  const ready =
    !refreshing &&
    !refreshFailed &&
    settingsWrites === 0 &&
    result?.enabled === enabled &&
    result.status === "ready"
  const failed =
    refreshFailed || (result?.enabled === enabled && result.status === "failed")
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setCaptureProtected(enabled).then(
      () => {
        if (active) {
          setResult({ enabled, status: "ready" })
          setInitialized(true)
        }
      },
      () => {
        if (active) setResult({ enabled, status: "failed" })
      },
    )
    return () => {
      active = false
    }
  }, [enabled, attempt])
  return (
    <CaptureReady.Provider value={ready}>
      <View className="flex-1 bg-[var(--bg-primary)]">
        <View
          className="flex-1"
          style={{ opacity: ready ? 1 : 0 }}
          pointerEvents={ready ? "auto" : "none"}
          importantForAccessibility={ready ? "auto" : "no-hide-descendants"}
          accessibilityElementsHidden={!ready}
        >
          {initialized ? children : null}
        </View>
        {failed ? (
          <View className="absolute inset-0 items-center justify-center gap-4 px-screen">
            <AppText accessibilityRole="alert" className="text-center">
              {t(refreshFailed ? "bootstrap.failed" : "gate.captureFailed")}
            </AppText>
            <Button
              disabled={settingsWrites > 0 || refreshing}
              onPress={() => {
                if (refreshFailed) {
                  void refreshAll().catch(() => undefined)
                  return
                }
                setResult(null)
                setAttempt((value) => value + 1)
              }}
            >
              {t("gate.tryAgain")}
            </Button>
          </View>
        ) : null}
      </View>
    </CaptureReady.Provider>
  )
}
