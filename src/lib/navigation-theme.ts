import { palette } from "@/constants/palette"

export function navigationColors(dark: boolean) {
  const colors = dark ? palette.dark : palette.light
  return {
    primary: colors.accent,
    background: colors.bgPrimary,
    card: colors.bgSurface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  }
}
