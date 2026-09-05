import type { ParseKeys, TFunction } from "i18next"

const labels: Record<string, ParseKeys> = {
  notes: "sheet.notes",
  flow_intensity: "sheet.flow",
  mood: "sheet.mood",
  symptoms: "sheet.symptoms",
  cervical_mucus: "sheet.cervicalMucus",
  bbt: "sheet.bbtLabel",
  sexual_activity: "sheet.sexualActivity",
  start_date: "history.fromDate",
  end_date: "history.toDate",
  date: "history.fromDate",
  cycle_id: "syncV2.cycle",
  avg_cycle_length: "calendar.avgCycle",
  avg_period_length: "calendar.periodDays",
  luteal_phase_length: "phase.luteal.name",
  theme: "settings.theme",
  language: "settings.language",
  discreet_mode: "settings.discreetMode",
  reminder_period_ahead: "settings.periodAhead",
  reminder_daily_log: "settings.dailyLog",
}

export function syncFieldLabel(field: string, t: TFunction): string {
  return t(labels[field] ?? "syncV2.review")
}

export function syncValueLabel(
  field: string | null,
  value: string | null,
  t: TFunction,
): string {
  if (value === null) return t(field === null ? "syncV2.deleted" : "sheet.notRecorded")
  if (field === null) {
    const record: Record<string, string | null> = JSON.parse(value)
    return Object.entries(record)
      .filter(([key]) => key in labels)
      .map(([key, item]) => `${syncFieldLabel(key, t)}: ${syncValueLabel(key, item, t)}`)
      .join("\n")
  }
  if (["sexual_activity", "discreet_mode", "reminder_daily_log"].includes(field))
    return t(value === "1" ? "common.yes" : "common.no")
  const catalogs: Record<string, string> = {
    flow_intensity: "flow",
    mood: "moods",
    cervical_mucus: "mucus",
  }
  if (catalogs[field]) return t(`${catalogs[field]}.${value}`, { defaultValue: value })
  if (field === "symptoms")
    return (
      (JSON.parse(value) as string[])
        .map((key) => t(`symptoms.${key}`, { defaultValue: key }))
        .join(", ") || t("flow.none")
    )
  const themes: Record<string, ParseKeys> = {
    light: "settings.themeLight",
    dark: "settings.themeDark",
    system: "settings.themeSystem",
  }
  if (field === "theme") return t(themes[value] ?? "settings.themeSystem")
  const languages: Record<string, ParseKeys> = {
    "en-US": "settings.langEnUS",
    "en-GB": "settings.langEnGB",
    "en-IN": "settings.langEnIN",
    hi: "settings.langHi",
    ja: "settings.langJa",
    ko: "settings.langKo",
  }
  if (field === "language") return t(languages[value] ?? "settings.system")
  return value
}
