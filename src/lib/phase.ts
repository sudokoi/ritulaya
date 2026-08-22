import type { Phase } from "@/constants/phase-colors"

export const PHASES: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"]

export function phaseNameKey(phase: Phase): `phase.${Phase}.name` {
  return `phase.${phase}.name`
}

export function phaseTipKey(phase: Phase): `phase.${Phase}.tip` {
  return `phase.${phase}.tip`
}
