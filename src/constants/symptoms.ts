export const SYMPTOM_CATALOG = [
  { key: "cramps", label: "Cramps" },
  { key: "bloating", label: "Bloating" },
  { key: "headache", label: "Headache" },
  { key: "fatigue", label: "Fatigue" },
  { key: "acne", label: "Acne" },
  { key: "cravings", label: "Cravings" },
  { key: "backache", label: "Backache" },
  { key: "nausea", label: "Nausea" },
  { key: "tender_breasts", label: "Tender Breasts" },
  { key: "insomnia", label: "Insomnia" },
  { key: "dizziness", label: "Dizziness" },
  { key: "hot_flashes", label: "Hot Flashes" },
  { key: "constipation", label: "Constipation" },
  { key: "diarrhea", label: "Diarrhea" },
  { key: "spotting", label: "Spotting" },
] as const

export type SymptomKey = (typeof SYMPTOM_CATALOG)[number]["key"]

export function getSymptomLabel(key: SymptomKey): string {
  return SYMPTOM_CATALOG.find((s) => s.key === key)?.label ?? key
}
