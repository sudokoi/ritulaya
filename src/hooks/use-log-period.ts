import { useCallback } from "react"
import { format } from "date-fns"
import * as Haptics from "expo-haptics"
import { getDatabase } from "@/services/database"
import { cycles as cyclesTable } from "@/db/schema"
import { useDayLogs } from "./use-day-logs"
import { useCycleActor } from "./use-cycle-actor"
import { nowISO, generateId } from "@/utils/date"
import type { FlowIntensity } from "@/types/day-log"
import type { Cycle } from "@/types/cycle"

export function useLogPeriod() {
  const { currentCycle } = useCycleActor()
  const { upsertDayLog } = useDayLogs()

  const getOrCreateCycle = useCallback(
    async (date: string): Promise<Cycle | null> => {
      if (currentCycle) return currentCycle

      const db = getDatabase()
      const now = nowISO()
      const id = generateId()
      const cycle: Cycle = {
        id,
        startDate: date,
        endDate: null,
        createdAt: now,
        updatedAt: now,
      }
      db.insert(cyclesTable).values(cycle).run()
      return cycle
    },
    [currentCycle],
  )

  const logPeriodToday = useCallback(
    async (flow: FlowIntensity = "medium") => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      const today = format(new Date(), "yyyy-MM-dd")

      const cycle = await getOrCreateCycle(today)
      if (cycle) {
        await upsertDayLog({
          date: today,
          cycleId: cycle.id,
          flowIntensity: flow,
          symptoms: [],
          mood: null,
        })
      }
    },
    [getOrCreateCycle, upsertDayLog],
  )

  return { logPeriodToday }
}
