import tokens from "@/constants/theme-tokens.json"

export type DayGradient = [string, string]

// Fertile gradients deliberately use a lighter ramp than the phase text color.
export const DAY_GRADIENTS = tokens.gradient

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

const FLOW_FILL: Record<string, number> = {
  spotting: 0.35,
  light: 0.55,
  medium: 0.8,
  heavy: 1,
}

export function flowLevelStyle(
  level: string | null | undefined,
  dark: boolean,
): DayStyle {
  if (!level || level === "none") return { fill: 0 }
  const fill = FLOW_FILL[level] ?? 1
  return { fill, colors: dayGradient("menstrual", dark) }
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
