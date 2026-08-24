import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"
import type { CervicalMucusKey } from "@/constants/cervical-mucus"
import type { FlowIntensity } from "@/types/day-log"

type Translate = (key: string, opts?: Record<string, unknown>) => string

function fallbackT(key: string): string {
  return key.split(".").pop() ?? key
}

function translateOrFallback(t: Translate | undefined, key: string): string {
  if (!t) return fallbackT(key)
  const rendered = t(key)
  // i18next returns the key when missing; treat as fallback
  if (rendered === key) return fallbackT(key)
  return rendered
}

export function symptomLabel(symptom: SymptomKey, t?: Translate): string {
  return translateOrFallback(t, `symptoms.${symptom}`)
}

export function symptomLabels(symptoms: SymptomKey[], t?: Translate): string[] {
  return symptoms.map((s) => symptomLabel(s, t))
}

export function moodLabel(mood: MoodKey, t?: Translate): string {
  return translateOrFallback(t, `moods.${mood}`)
}

export function mucusLabel(mucus: CervicalMucusKey, t?: Translate): string {
  return translateOrFallback(t, `mucus.${mucus}`)
}

export function flowLabel(flow: FlowIntensity, t?: Translate): string {
  return translateOrFallback(t, `flow.${flow}`)
}
