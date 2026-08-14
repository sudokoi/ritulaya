import type { Phase } from "@/constants/phase-colors"

export function getPhase(daysUntilPeriod: number, avgCycleLength: number): Phase {
  if (daysUntilPeriod <= 5) return "menstrual"
  const dayInCycle = avgCycleLength - daysUntilPeriod
  if (dayInCycle <= 5) return "menstrual"
  if (dayInCycle <= 13) return "follicular"
  if (dayInCycle <= 15) return "ovulation"
  return "luteal"
}

export const PHASE_TIPS: Record<Phase, string> = {
  menstrual: "Gentle movement and extra rest help. Be kind to yourself this week.",
  follicular: "Your energy is rising. Great time for new projects and planning.",
  ovulation: "Your energy peaks now. Great time for intense workouts & social plans.",
  luteal: "A good time to wrap things up. Prioritize rest and comfort.",
}

export const PHASE_NAMES: Record<Phase, string> = {
  menstrual: "Menstrual Phase",
  follicular: "Follicular Phase",
  ovulation: "Ovulation Phase",
  luteal: "Luteal Phase",
}
