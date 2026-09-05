import { useEffect, useState } from "react"
import { ActivityIndicator, View } from "react-native"
import { useTranslation } from "react-i18next"
import { refreshAll } from "@/data/refresh"
import { logger } from "@/services/logger"
import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"
import { useThemeColors } from "@/hooks/use-theme-colors"

/** Never mount a protected route (including widget links) from default caches. */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { accent } = useThemeColors()
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    refreshAll().then(
      () => {
        if (active) setStatus("ready")
      },
      (error) => {
        logger.error("app", "Initialization failed", error)
        if (active) setStatus("failed")
      },
    )
    return () => {
      active = false
    }
  }, [attempt])

  if (status === "ready") return <>{children}</>
  return (
    <View className="flex-1 items-center justify-center bg-[var(--bg-primary)] px-6">
      {status === "loading" ? (
        <ActivityIndicator color={accent} />
      ) : (
        <>
          <AppText className="text-center" accessibilityRole="alert">
            {t("bootstrap.failed")}
          </AppText>
          <Button
            className="mt-4"
            onPress={() => {
              setStatus("loading")
              setAttempt((value) => value + 1)
            }}
          >
            {t("gate.tryAgain")}
          </Button>
        </>
      )}
    </View>
  )
}
