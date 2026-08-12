export const PHASE_COLORS = {
  menstrual: {
    hex: "#C17B9D",
    name: "Deep Mauve",
  },
  follicular: {
    hex: "#7BA891",
    name: "Sage Green",
  },
  ovulation: {
    hex: "#C9A96E",
    name: "Warm Amber",
  },
  luteal: {
    hex: "#9B8EC4",
    name: "Dusty Lavender",
  },
} as const

export type Phase = keyof typeof PHASE_COLORS

export const FLOW_COLORS = {
  none: "#E8E4DF",
  spotting: "#D4C5C9",
  light: "#C17B9D",
  medium: "#A85D7D",
  heavy: "#8B3F5E",
} as const

export const DISCREET_COLOR = "#8A8986"
