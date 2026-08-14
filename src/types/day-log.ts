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
  mood?: MoodKey | null
  notes?: string | null
  cervicalMucus?: string | null
  bbt?: number | null
  sexualActivity?: boolean
}

export interface DayLogUpdate {
  flowIntensity?: FlowIntensity | null
  symptoms?: SymptomKey[]
  mood?: MoodKey | null
  notes?: string | null
  cervicalMucus?: string | null
  bbt?: number | null
  sexualActivity?: boolean
  cycleId?: string | null
}
