import { Stack, DarkTheme, DefaultTheme, ThemeProvider } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { PortalHost } from "@rn-primitives/portal"
import { useColorScheme } from "nativewind"
import { useEffect } from "react"
import { StatusBar } from "expo-status-bar"
import { navigationColors } from "@/lib/navigation-theme"
import { useWidget } from "@/hooks/use-widget"
import { useAppRefresh } from "@/hooks/use-app-refresh"
import { useSettings } from "@/hooks/use-settings"
import { BiometricGate } from "@/components/biometric-gate"
import { AppBootstrap } from "@/components/app-bootstrap"
import { useNotifications } from "@/hooks/use-notifications"
import { changeLanguage } from "@/i18n"
import "@/global.css"

const lightNavigationTheme = { ...DefaultTheme, colors: navigationColors(false) }
const darkNavigationTheme = { ...DarkTheme, colors: navigationColors(true) }

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme()
  const { theme, language } = useSettings()

  useEffect(() => {
    setColorScheme(theme)
  }, [theme, setColorScheme])

  useEffect(() => {
    void changeLanguage(language)
  }, [language])

  return (
    <GestureHandlerRootView className="flex-1">
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} animated={false} />
      <AppBootstrap>
        <AppEffects />
        <BiometricGate>
          <ThemeProvider
            value={colorScheme === "dark" ? darkNavigationTheme : lightNavigationTheme}
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings/github-sync" />
              <Stack.Screen name="settings/privacy" />
              <Stack.Screen name="settings/insights" />
            </Stack>
            <PortalHost />
          </ThemeProvider>
        </BiometricGate>
      </AppBootstrap>
    </GestureHandlerRootView>
  )
}

function AppEffects() {
  useAppRefresh()
  useWidget()
  useNotifications()
  return null
}
