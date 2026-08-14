export const PHASE_COLORS = {
  menstrual: {
    hex: "#A15878",
    darkHex: "#DFA9C0",
    name: "Deep Mauve",
  },
  follicular: {
    hex: "#42725A",
    darkHex: "#A2CCB4",
    name: "Sage Green",
  },
  ovulation: {
    hex: "#8C6A24",
    darkHex: "#E4C585",
    name: "Warm Amber",
  },
  luteal: {
    hex: "#67589C",
    darkHex: "#BDA9E2",
    name: "Dusty Lavender",
  },
} as const

export type Phase = keyof typeof PHASE_COLORS
