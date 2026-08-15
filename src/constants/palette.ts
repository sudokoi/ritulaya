/**
 * Single source of truth for the app's theme tokens.
 *
 * `global.css` (--bg-primary, --text-primary, …) and `tailwind.config.js`
 * (`menstrual`, `follicular`, …) must stay in sync with this file — update
 * values here first and mirror them in those two places.
 */
export const palette = {
  light: {
    bgPrimary: "#faf8f5",
    bgSurface: "#ffffff",
    bgMuted: "#ece7e1",
    textPrimary: "#2d2d2f",
    textMuted: "#6f6b64",
    border: "#e8e4df",
    accent: "#0F766E",
  },
  dark: {
    bgPrimary: "#141416",
    bgSurface: "#1e1e21",
    bgMuted: "#2c2c30",
    textPrimary: "#f2f1ee",
    textMuted: "#a9a8a4",
    border: "#2f2f33",
    accent: "#5EEAD4",
  },
} as const

/**
 * Filled-button background. Kept identical across light and dark themes so
 * white button labels always meet WCAG AA (≥ 4.5:1).
 */
export const accentFill = "#0F766E"
