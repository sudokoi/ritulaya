import { loadCycles } from "@/stores/cycle-store"
import { loadDayLogs } from "@/stores/day-log-store"
import { loadSettings } from "@/stores/settings-store"

export async function refreshAll(): Promise<void> {
  await Promise.all([loadCycles(), loadDayLogs(), loadSettings()])
}
