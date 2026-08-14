import { Stack } from "expo-router"
import { DefaultTheme, ThemeProvider } from "expo-router"
import { useColorScheme } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { PortalHost } from "@rn-primitives/portal"
import "@/global.css"

export default function RootLayout() {
  const colorScheme = useColorScheme()
  return (
    <GestureHandlerRootView className="flex-1">
      <ThemeProvider value={colorScheme === "dark" ? DefaultTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings/github-sync" />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
