import { useColorScheme } from "nativewind"

const palettes = {
  light: {
    muted: "#6f6b64",
    accent: "#42725A",
  },
  dark: {
    muted: "#a9a8a4",
    accent: "#A2CCB4",
  },
} as const

export function useThemeColors() {
  const { colorScheme } = useColorScheme()
  return colorScheme === "dark" ? palettes.dark : palettes.light
}
