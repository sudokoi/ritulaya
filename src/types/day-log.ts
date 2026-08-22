import type { MoodKey } from "@/constants/moods"
import type { SymptomKey } from "@/constants/symptoms"

export type FlowIntensity = "none" | "spotting" | "light" | "medium" | "heavy"

export interface DayLog {
  id: string
  date: string
  cycleId: string | null
  flowIntensity: FlowIntensity | null
  symptoms: SymptomKey[]
  mood: MoodKey | null
  notes: string | null
  cervicalMucus: string | null
  bbt: number | null
  sexualActivity: number
  createdAt: string
  updatedAt: string
}

export interface DayLogCreate {
  date: string
  cycleId?: string | null
  flowIntensity?: FlowIntensity | null
  symptoms?: SymptomKey[]
  /** An empty string explicitly clears the field; null keeps the existing value. */
  mood?: MoodKey | "" | null
  /** An empty string explicitly clears the field; null keeps the existing value. */
  notes?: string | null
  /** An empty string explicitly clears the field; null keeps the existing value. */
  cervicalMucus?: string | null
  /** 0 explicitly clears the field (an impossible body temperature); null keeps it. */
  bbt?: number | null
  sexualActivity?: boolean
}
