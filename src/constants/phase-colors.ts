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
