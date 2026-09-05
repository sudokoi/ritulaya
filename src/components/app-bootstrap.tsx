import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { refreshAll } from "@/data/refresh"
import { logger } from "@/services/logger"

/** Never mount a protected route (including widget links) from default caches. */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
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
        <ActivityIndicator />
      ) : (
        <>
          <Text className="text-center text-[var(--text-primary)]">
            {t("bootstrap.failed")}
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-4 rounded-button bg-[var(--accent)] px-6 py-4"
            onPress={() => {
              setStatus("loading")
              setAttempt((value) => value + 1)
            }}
          >
            <Text className="text-[var(--on-accent)]">{t("gate.tryAgain")}</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}
