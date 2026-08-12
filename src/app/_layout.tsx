import { DefaultTheme, ThemeProvider } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useColorScheme } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { PortalHost } from "@rn-primitives/portal"
import "@/global.css"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const colorScheme = useColorScheme()
  return (
    <GestureHandlerRootView className="flex-1">
      <ThemeProvider value={colorScheme === "dark" ? DefaultTheme : DefaultTheme}>
        <PortalHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
