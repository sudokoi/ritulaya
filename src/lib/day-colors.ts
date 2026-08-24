export type DayGradient = [string, string]

export const DAY_GRADIENTS = {
  menstrual: {
    light: ["#C27B9A", "#A15878"],
    dark: ["#E9C6D6", "#DFA9C0"],
  },
  // Ovulation/fertile uses a lighter ramp than PHASE_COLORS.ovulation (#8C6A24 / #E4C585)
  // so fertile windows remain distinct from the saturated ovulation dot while
  // staying in family. Keep in sync with palette intent, not the exact hex.
  ovulation: {
    light: ["#EBDDB4", "#D9C285"],
    dark: ["#C9B078", "#B0945E"],
  },
} as const

export type DayGradientKind = keyof typeof DAY_GRADIENTS

export function dayGradient(kind: DayGradientKind, dark: boolean): DayGradient {
  const variant = dark ? "dark" : "light"
  const [from, to] = DAY_GRADIENTS[kind][variant]
  return [from, to]
}

export interface DayStyle {
  fill: number
  colors?: DayGradient
  opacity?: number
}

export function resolveDayStyle({
  isPeriod,
  isPredicted,
  isOvulation,
  fertile,
  dark,
}: {
  isPeriod: boolean
  isPredicted: boolean
  isOvulation: boolean
  fertile: number
  dark: boolean
}): DayStyle {
  if (isPeriod) return { fill: 1, colors: dayGradient("menstrual", dark) }
  if (isPredicted)
    return { fill: 1, colors: dayGradient("menstrual", dark), opacity: 0.45 }
  if (isOvulation) return { fill: 1, colors: dayGradient("ovulation", dark) }
  if (fertile > 0) return { fill: fertile, colors: dayGradient("ovulation", dark) }
  return { fill: 0, opacity: 1 }
}
