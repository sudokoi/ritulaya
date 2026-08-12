export interface Cycle {
  id: string
  startDate: string
  endDate: string | null
  createdAt: string
  updatedAt: string
}

export interface CycleCreate {
  startDate: string
  endDate?: string | null
}

export interface CycleUpdate {
  startDate?: string
  endDate?: string | null
}
