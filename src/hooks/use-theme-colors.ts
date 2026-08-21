import { useColorScheme } from "nativewind"
import { palette } from "@/constants/palette"

export function useThemeColors() {
  const { colorScheme } = useColorScheme()
  const colors = colorScheme === "dark" ? palette.dark : palette.light
  return { muted: colors.textMuted, accent: colors.accent, danger: colors.danger }
}
