import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { listCycles, listDayLogs } from "@/services/db"
import type { Cycle } from "@/types/cycle"
import type { DayLog } from "@/types/day-log"

export function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""')
  // Neutralize spreadsheet formula injection (=, +, -, @ prefixes, and
  // leading tab/CR per OWASP CSV injection guidance).
  const safe = /^[=+\-@\t\r]/.test(escaped) ? `'${escaped}` : escaped
  return `"${safe}"`
}

export function toCyclesCsv(cycles: Cycle[]): string {
  const header = "start_date,end_date,created_at,id,updated_at"
  const rows = cycles.map((c) =>
    [c.startDate, c.endDate ?? "", c.createdAt, c.id, c.updatedAt].map(csvCell).join(","),
  )
  return [header, ...rows].join("\n")
}

export function toLogsCsv(logs: DayLog[]): string {
  const header =
    "date,flow_intensity,symptoms,mood,notes,id,cycle_id,cervical_mucus,bbt,sexual_activity,created_at,updated_at"
  const rows = logs.map((l) =>
    [
      l.date,
      l.flowIntensity ?? "",
      l.symptoms.join(";"),
      l.mood ?? "",
      l.notes ?? "",
      l.id,
      l.cycleId ?? "",
      l.cervicalMucus ?? "",
      l.bbt?.toString() ?? "",
      l.sexualActivity?.toString() ?? "",
      l.createdAt,
      l.updatedAt,
    ]
      .map(csvCell)
      .join(","),
  )
  return [header, ...rows].join("\n")
}

function writeCsv(name: string, content: string): File {
  const file = new File(Paths.cache, name)
  file.create({ intermediates: true, overwrite: true })
  file.write(content)
  return file
}

export async function exportData() {
  const cycles = await listCycles()
  const logs = await listDayLogs()

  const cyclesFile = writeCsv("ritulaya-cycles.csv", toCyclesCsv(cycles))
  const logsFile = writeCsv("ritulaya-day-logs.csv", toLogsCsv(logs))

  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(logsFile.uri)
      await Sharing.shareAsync(cyclesFile.uri)
    }
  } finally {
    cyclesFile.delete()
    logsFile.delete()
  }
}
