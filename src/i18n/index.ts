// Hermes can lack Intl.PluralRules; the polyfill is a no-op when native
// support exists and must load before i18next initialises pluralization.
import "intl-pluralrules"
import i18next, { type i18n as I18n } from "i18next"
import { setDefaultOptions } from "date-fns"
import {
  enUS,
  enGB,
  enIN,
  hi,
  ja,
  ko,
  type Locale as DateFnsLocale,
} from "date-fns/locale"
import * as Localization from "expo-localization"

import enUSJson from "../../locales/en-US/translation.json"
import enGBJson from "../../locales/en-GB/translation.json"
import enINJson from "../../locales/en-IN/translation.json"
import hiJson from "../../locales/hi/translation.json"
import jaJson from "../../locales/ja/translation.json"
import koJson from "../../locales/ko/translation.json"

export const SUPPORTED_LOCALES = ["en-US", "en-GB", "en-IN", "hi", "ja", "ko"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export type LanguageSetting = SupportedLocale | "system"

const RESOURCES: Record<SupportedLocale, object> = {
  "en-US": enUSJson,
  "en-GB": enGBJson,
  "en-IN": enINJson,
  hi: hiJson,
  ja: jaJson,
  ko: koJson,
}

const DATE_LOCALES: Record<SupportedLocale, DateFnsLocale> = {
  "en-US": enUS,
  "en-GB": enGB,
  "en-IN": enIN,
  hi,
  ja,
  ko,
}

/** Type-safe translation keys, derived from the source locale. */
export type TranslationKey = FlattenKeys<typeof enUSJson>

type FlattenKeys<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${FlattenKeys<T[K]>}`
    }[keyof T & string]

declare module "i18next" {
  interface CustomTypeOptions {
    returnNull: false
    resources: {
      translation: typeof enUSJson
    }
  }
}

/**
 * Resolves a stored language setting to a concrete locale. "system" (and the
 * legacy "en" value) follows the device language when it is supported.
 */
export function resolveLocale(setting: string): SupportedLocale {
  if (setting !== "system" && setting !== "en") {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(setting)) {
      return setting as SupportedLocale
    }
  }
  const device = Localization.getLocales()[0]?.languageTag ?? "en-US"
  if ((SUPPORTED_LOCALES as readonly string[]).includes(device)) {
    return device as SupportedLocale
  }
  const base = device.split("-")[0]
  const match = SUPPORTED_LOCALES.find((l) => l.split("-")[0] === base)
  return match ?? "en-US"
}

/**
 * Activates a locale for translations and date formatting. All locales are
 * bundled statically — switching is synchronous and cannot fail.
 */
export async function changeLanguage(setting: string): Promise<void> {
  const locale = resolveLocale(setting)
  if (i18next.language !== locale) {
    await i18next.changeLanguage(locale)
  }
  setDefaultOptions({ locale: DATE_LOCALES[locale] })
}

i18next.init({
  resources: Object.fromEntries(
    Object.entries(RESOURCES).map(([lng, translation]) => [lng, { translation }]),
  ),
  lng: resolveLocale("system"),
  fallbackLng: "en-US",
  interpolation: { escapeValue: false },
  returnNull: false,
})

// Align date formatting with the initial locale.
setDefaultOptions({ locale: DATE_LOCALES[i18next.language as SupportedLocale] })

export const i18n = i18next as I18n
export default i18next
