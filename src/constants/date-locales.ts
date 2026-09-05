import { enUS, enGB, enIN, hi, ja, ko, type Locale } from "date-fns/locale"

export const DATE_LOCALES: Record<string, Locale> = {
  "en-US": enUS,
  "en-GB": enGB,
  "en-IN": enIN,
  hi,
  ja,
  ko,
}
