import { Stack, DarkTheme, DefaultTheme, ThemeProvider } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { PortalHost } from "@rn-primitives/portal"
import { useColorScheme } from "nativewind"
import { useEffect } from "react"
import { useWidget } from "@/hooks/use-widget"
import { useSettings } from "@/hooks/use-settings"
import "@/global.css"

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme()
  const { theme } = useSettings()

  useEffect(() => {
    setColorScheme(theme)
  }, [theme, setColorScheme])

  useWidget()

  return (
    <GestureHandlerRootView className="flex-1">
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings/github-sync" />
          <Stack.Screen name="settings/privacy" />
          <Stack.Screen name="settings/insights" />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
