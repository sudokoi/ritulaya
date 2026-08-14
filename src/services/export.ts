import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { listCycles } from "@/db/cycles"
import { listDayLogs } from "@/db/day-logs"
import type { Cycle } from "@/types/cycle"
import type { DayLog } from "@/types/day-log"

function toCyclesCsv(cycles: Cycle[]): string {
  const header = "start_date,end_date,created_at"
  const rows = cycles.map((c) => [c.startDate, c.endDate ?? "", c.createdAt].join(","))
  return [header, ...rows].join("\n")
}

function toLogsCsv(logs: DayLog[]): string {
  const header = "date,flow_intensity,symptoms,mood,notes"
  const rows = logs.map((l) =>
    [
      l.date,
      l.flowIntensity ?? "",
      l.symptoms.join(";"),
      l.mood ?? "",
      (l.notes ?? "").replace(/[\r\n]+/g, " ").replace(/,/g, ";"),
    ].join(","),
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
  const cycles = listCycles()
  const logs = listDayLogs()

  const cyclesFile = writeCsv("ritulaya-cycles.csv", toCyclesCsv(cycles))
  const logsFile = writeCsv("ritulaya-day-logs.csv", toLogsCsv(logs))

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(logsFile.uri)
    await Sharing.shareAsync(cyclesFile.uri)
  }
}
