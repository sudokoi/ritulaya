import { applyCycleRepair, previewCycleRepair } from "@/services/db"
import { refreshAll } from "@/data/refresh"

export const previewHistoryRepair = previewCycleRepair

export async function confirmHistoryRepair(token: string): Promise<void> {
  await applyCycleRepair(token)
  await refreshAll()
}
