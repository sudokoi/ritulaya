import { useEffect, useRef, useState } from "react"
import { AppState, Text, TouchableOpacity, View } from "react-native"
import * as LocalAuthentication from "expo-local-authentication"
import { Fingerprint } from "lucide-react-native"
import { useSettings } from "@/hooks/use-settings"

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { biometricLock } = useSettings()
  const [unlocked, setUnlocked] = useState(!biometricLock)
  const [prevBiometricLock, setPrevBiometricLock] = useState(biometricLock)
  const [error, setError] = useState<string | null>(null)
  const promptingRef = useRef(false)

  if (prevBiometricLock !== biometricLock) {
    setPrevBiometricLock(biometricLock)
    setUnlocked(!biometricLock)
  }

  const authenticate = async () => {
    if (promptingRef.current) return
    promptingRef.current = true
    setError(null)
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Ritulaya",
        cancelLabel: "Cancel",
      })
      if (result.success) {
        setUnlocked(true)
      } else if (
        result.error !== "user_cancel" &&
        result.error !== "system_cancel" &&
        result.error !== "app_cancel"
      ) {
        setError("Authentication failed. Please try again.")
      }
    } catch {
      setError("Biometric authentication is unavailable on this device.")
    } finally {
      promptingRef.current = false
    }
  }

  useEffect(() => {
    if (!biometricLock) return
    let wasBackground = false
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        wasBackground = true
      } else if (state === "active" && wasBackground) {
        wasBackground = false
        setUnlocked(false)
      }
    })
    return () => subscription.remove()
  }, [biometricLock])

  if (!biometricLock || unlocked) return <>{children}</>

  return (
    <View className="flex-1 items-center justify-center bg-[var(--bg-primary)] px-6">
      <Fingerprint size={48} color="#7BA891" />
      <Text className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
        Ritulaya is locked
      </Text>
      <Text className="mt-2 text-center text-sm text-[var(--text-muted)]">
        Authenticate to view your data.
      </Text>
      {error ? (
        <Text className="mt-2 text-center text-sm text-red-500">{error}</Text>
      ) : null}
      <TouchableOpacity
        onPress={authenticate}
        className="mt-6 rounded-button bg-follicular px-6 py-4"
      >
        <Text className="font-semibold text-white">Unlock</Text>
      </TouchableOpacity>
    </View>
  )
}
