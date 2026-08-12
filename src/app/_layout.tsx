import { Slot } from "expo-router"
import { DefaultTheme, ThemeProvider } from "expo-router"
import { useColorScheme } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { PortalHost } from "@rn-primitives/portal"
import { StoreProvider } from "@/providers/store-provider"
import { DiscreetGuard } from "@/providers/discreet-guard"
import "@/global.css"

export default function RootLayout() {
  const colorScheme = useColorScheme()
  return (
    <GestureHandlerRootView className="flex-1">
      <StoreProvider>
        <DiscreetGuard>
          <ThemeProvider value={colorScheme === "dark" ? DefaultTheme : DefaultTheme}>
            <Slot />
            <PortalHost />
          </ThemeProvider>
        </DiscreetGuard>
      </StoreProvider>
    </GestureHandlerRootView>
  )
}
