import { useTranslation } from "react-i18next"
import { DATE_LOCALES } from "@/constants/date-locales"

/** Make the locale an explicit render dependency, including for React Compiler. */
export function useDateLocale() {
  const { i18n } = useTranslation()
  return DATE_LOCALES[i18n.resolvedLanguage ?? "en-US"] ?? DATE_LOCALES["en-US"]
}
