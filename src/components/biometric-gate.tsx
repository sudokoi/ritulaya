import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, Text, View } from "react-native"
import {
  authenticate as authenticateDevice,
  isAuthenticationCurrent,
  cancelAuthentication,
} from "@/services/authentication"
import { Fingerprint } from "lucide-react-native"
import { useTranslation } from "react-i18next"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { Button } from "@/components/ui/button"

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { biometricLock } = useSettings()
  const { accent, danger } = useThemeColors()
  const [unlocked, setUnlocked] = useState(!biometricLock)
  const [prevBiometricLock, setPrevBiometricLock] = useState(biometricLock)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const promptingRef = useRef(false)
  const appStateRef = useRef(AppState.currentState ?? "active")
  const generationRef = useRef(0)
  const tokenRef = useRef<string | null>(null)
  const resumeAuthenticationRef = useRef(false)
  const automaticRequestRef = useRef(false)
  const [attempt, setAttempt] = useState(0)

  if (prevBiometricLock !== biometricLock) {
    setPrevBiometricLock(biometricLock)
    setUnlocked(!biometricLock)
    setUnavailable(false)
  }

  const authenticate = useCallback(async () => {
    if (promptingRef.current || appStateRef.current !== "active") return
    promptingRef.current = true
    tokenRef.current = null
    automaticRequestRef.current = false
    resumeAuthenticationRef.current = false
    const generation = generationRef.current
    setError(null)
    setUnavailable(false)
    try {
      const result = await authenticateDevice(
        t("gate.unlock"),
        t("gate.useDeviceCredential"),
      )
      if (generation !== generationRef.current) return
      if (result.success) {
        tokenRef.current = result.token
        setUnlocked(
          appStateRef.current === "active" && isAuthenticationCurrent(result.token),
        )
      } else if (result.error === "unavailable") {
        setUnavailable(true)
      } else if (result.error !== "cancelled") {
        setError(t("gate.failed"))
      }
    } catch {
      if (generation === generationRef.current) setUnavailable(true)
    } finally {
      promptingRef.current = false
    }
  }, [t])

  useEffect(() => {
    if (!biometricLock || unlocked) return
    automaticRequestRef.current = true
    const timer = setTimeout(() => {
      if (automaticRequestRef.current) void authenticate()
    }, 250)
    return () => clearTimeout(timer)
  }, [biometricLock, unlocked, attempt, authenticate])

  useEffect(() => {
    if (!biometricLock) return
    appStateRef.current = AppState.currentState ?? "active"
    const subscription = AppState.addEventListener("change", (state) => {
      appStateRef.current = state
      if (state !== "active") {
        if (!promptingRef.current && tokenRef.current !== null) {
          resumeAuthenticationRef.current = true
        }
        setUnlocked(false)
      } else {
        // Android owns the distinction between a credential handoff and an
        // expired grant. Never trust a success queued before native backgrounding.
        const current =
          tokenRef.current !== null && isAuthenticationCurrent(tokenRef.current)
        setUnlocked(current)
        if (!current && resumeAuthenticationRef.current) {
          resumeAuthenticationRef.current = false
          setAttempt((value) => value + 1)
        }
      }
    })
    return () => {
      generationRef.current += 1
      appStateRef.current = "unknown"
      tokenRef.current = null
      void cancelAuthentication().catch(() => undefined)
      subscription.remove()
    }
  }, [biometricLock])

  if (!biometricLock || unlocked) return <>{children}</>

  return (
    <View className="flex-1 items-center justify-center bg-[var(--bg-primary)] px-6">
      <Fingerprint size={48} color={accent} />
      <Text className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
        {t("gate.lockedTitle")}
      </Text>
      <Text className="mt-2 text-center text-sm text-[var(--text-muted)]">
        {t("gate.lockedBody")}
      </Text>
      {unavailable ? (
        <Text className="mt-2 text-center text-sm" style={{ color: danger }}>
          {t("gate.unavailable")}
        </Text>
      ) : error ? (
        <Text className="mt-2 text-center text-sm" style={{ color: danger }}>
          {error}
        </Text>
      ) : null}
      <Button
        onPress={authenticate}
        className="mt-6"
        accessibilityLabel={t("gate.unlock")}
      >
        {unavailable ? t("gate.tryAgain") : t("gate.unlock")}
      </Button>
    </View>
  )
}
