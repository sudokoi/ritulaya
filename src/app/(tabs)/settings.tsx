import { View, Text, ScrollView, Pressable, Switch, Alert } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as LocalAuthentication from "expo-local-authentication"
import {
  Shield,
  EyeOff,
  Download,
  Bell,
  Smartphone,
  ChevronRight,
  Languages,
  Cloud,
  Info,
  Bug,
  BarChart3,
} from "lucide-react-native"
import { cn } from "@/lib/utils"
import { discreetLabel } from "@/lib/discreet"
import { useTranslation } from "react-i18next"
import { SUPPORTED_LOCALES, type LanguageSetting } from "@/i18n"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { usePrediction } from "@/hooks/use-predictions"
import { useSync } from "@/hooks/use-sync"
import { exportData } from "@/services/export"
import { reportBug } from "@/services/bug-report"
import { useEffect } from "react"

const LANGUAGE_OPTIONS: LanguageSetting[] = ["system", ...SUPPORTED_LOCALES]

function resolveLanguageSetting(setting: string): LanguageSetting {
  if (setting === "en") return "system"
  return (LANGUAGE_OPTIONS as string[]).includes(setting)
    ? (setting as LanguageSetting)
    : "system"
}

const THEME_OPTIONS = [
  { value: "system", labelKey: "settings.themeSystem" },
  { value: "light", labelKey: "settings.themeLight" },
  { value: "dark", labelKey: "settings.themeDark" },
] as const
const PERIOD_AHEAD_OPTIONS = [0, 1, 2, 3, 5, 7]

interface SettingsRowProps {
  icon: React.ReactNode
  label: string
  value?: string
  onPress?: () => void
  right?: React.ReactNode
  danger?: boolean
}

function SettingsRow({ icon, label, value, onPress, right, danger }: SettingsRowProps) {
  const { muted } = useThemeColors()
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !right}
      className="flex-row items-center justify-between border-b border-[var(--border)] py-4 active:opacity-60"
    >
      <View className="flex-row items-center gap-3">
        {icon}
        <Text
          className={cn(
            "text-base",
            danger ? "text-red-500" : "text-[var(--text-primary)]",
          )}
        >
          {label}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        {value ? <Text className="text-sm text-[var(--text-muted)]">{value}</Text> : null}
        {right ?? (onPress ? <ChevronRight size={18} color={muted} /> : null)}
      </View>
    </Pressable>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 mt-6 text-xs font-semibold uppercase text-[var(--text-muted)]">
      {title}
    </Text>
  )
}

export default function SettingsScreen() {
  const { t } = useTranslation()
  const {
    biometricLock,
    discreetMode: discreet,
    theme,
    reminderPeriodAhead,
    reminderDailyLog,
    language,
    update,
    load,
  } = useSettings()
  const { periodLength, avgCycleLength } = usePrediction()
  const sync = useSync()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    load()
  }, [load])

  const cycleTheme = () => {
    const values = THEME_OPTIONS.map((option) => option.value)
    const idx = values.indexOf(theme)
    update({ theme: values[(idx + 1) % values.length] })
  }

  const setBiometricLock = async (value: boolean) => {
    if (!value) {
      update({ biometricLock: false })
      return
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync())
    if (!enrolled) {
      Alert.alert(
        t("settings.biometricsUnavailableTitle"),
        t("settings.biometricsUnavailableBody"),
      )
      return
    }
    update({ biometricLock: true })
  }

  const currentThemeOption = THEME_OPTIONS.find((option) => option.value === theme)
  const currentThemeLabel = currentThemeOption
    ? t(currentThemeOption.labelKey)
    : undefined

  const cycleLanguage = () => {
    const idx = LANGUAGE_OPTIONS.indexOf(language as LanguageSetting)
    const next = LANGUAGE_OPTIONS[(idx + 1) % LANGUAGE_OPTIONS.length]
    update({ language: next })
  }

  const languageLabels: Record<LanguageSetting, string> = {
    system: t("settings.system"),
    "en-US": t("settings.langEnUS"),
    "en-GB": t("settings.langEnGB"),
    "en-IN": t("settings.langEnIN"),
    hi: t("settings.langHi"),
    ja: t("settings.langJa"),
    ko: t("settings.langKo"),
  }
  const currentLanguageLabel =
    languageLabels[resolveLanguageSetting(language)] ?? languageLabels.system

  const cyclePeriodAhead = () => {
    const idx = PERIOD_AHEAD_OPTIONS.indexOf(reminderPeriodAhead)
    const next = PERIOD_AHEAD_OPTIONS[(idx + 1) % PERIOD_AHEAD_OPTIONS.length]
    update({ reminderPeriodAhead: next })
  }

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="px-6 pb-2" style={{ paddingTop: insets.top + 24 }}>
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, t("settings.title"), t("discreet.settingsTitle"))}
        </Text>
      </View>

      <Pressable
        className="mx-4 mb-4 rounded-card bg-[var(--bg-surface)] px-5 py-4 active:opacity-60"
        onPress={() => router.push("/seed")}
        accessibilityRole="button"
        accessibilityLabel={t("settings.adjustCycle")}
      >
        <View className="flex-row justify-between">
          <StatItem
            value={`${avgCycleLength}`}
            label={t("calendar.avgCycle")}
            discreet={discreet}
          />
          <StatItem
            value={`${periodLength}`}
            label={t("calendar.periodDays")}
            discreet={discreet}
          />
          <View className="flex-1 items-center justify-center">
            <Text className="text-xs text-[var(--text-muted)]">{t("common.edit")}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/settings/insights")}
          className="mt-3 flex-row items-center justify-center gap-1 active:opacity-60"
        >
          <BarChart3 size={14} color={colors.accent} />
          <Text className="text-sm font-medium text-accent dark:text-accent-dark">
            {discreetLabel(
              discreet,
              t("settings.viewInsights"),
              t("discreet.viewInsights"),
            )}
          </Text>
        </Pressable>
      </Pressable>

      <View className="mx-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader
          title={discreetLabel(
            discreet,
            t("settings.sectionPrivacy"),
            t("discreet.sectionPrivacy"),
          )}
        />
        <SettingsRow
          icon={<Shield size={20} color={colors.muted} />}
          label={discreetLabel(
            discreet,
            t("settings.biometricLock"),
            t("discreet.biometricLock"),
          )}
          right={
            <Switch
              value={biometricLock}
              onValueChange={setBiometricLock}
              trackColor={{ true: colors.accent }}
            />
          }
        />
        <SettingsRow
          icon={<EyeOff size={20} color={colors.muted} />}
          label={discreetLabel(
            discreet,
            t("settings.discreetMode"),
            t("discreet.discreetMode"),
          )}
          right={
            <Switch
              value={discreet}
              onValueChange={(v) => update({ discreetMode: v })}
              trackColor={{ true: colors.accent }}
            />
          }
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader
          title={discreetLabel(
            discreet,
            t("settings.sectionData"),
            t("discreet.sectionData"),
          )}
        />
        <SettingsRow
          icon={<Cloud size={20} color={colors.muted} />}
          label={discreetLabel(
            discreet,
            t("settings.githubSync"),
            t("discreet.githubSync"),
          )}
          value={
            sync.config
              ? `${sync.config.repoOwner}/${sync.config.repoName}`
              : discreetLabel(discreet, t("settings.notSetUp"), t("common.off"))
          }
          onPress={() => router.push("/settings/github-sync")}
        />
        <SettingsRow
          icon={<Download size={20} color={colors.muted} />}
          label={discreetLabel(
            discreet,
            t("settings.exportData"),
            t("discreet.exportData"),
          )}
          onPress={() =>
            exportData().catch(() =>
              Alert.alert(
                t("settings.exportFailedTitle"),
                t("settings.exportFailedBody"),
              ),
            )
          }
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader
          title={discreetLabel(
            discreet,
            t("settings.sectionReminders"),
            t("discreet.sectionReminders"),
          )}
        />
        <SettingsRow
          icon={<Bell size={20} color={colors.muted} />}
          label={discreetLabel(
            discreet,
            t("settings.periodAhead"),
            t("discreet.periodAhead"),
          )}
          value={
            reminderPeriodAhead > 0
              ? t("common.days", { count: reminderPeriodAhead })
              : t("common.off")
          }
          onPress={cyclePeriodAhead}
        />
        <SettingsRow
          icon={<Bell size={20} color={colors.muted} />}
          label={discreetLabel(discreet, t("settings.dailyLog"), t("discreet.dailyLog"))}
          right={
            <Switch
              value={reminderDailyLog}
              onValueChange={(v) => update({ reminderDailyLog: v })}
              trackColor={{ true: colors.accent }}
            />
          }
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader
          title={discreetLabel(
            discreet,
            t("settings.sectionAppearance"),
            t("discreet.sectionAppearance"),
          )}
        />
        <SettingsRow
          icon={<Smartphone size={20} color={colors.muted} />}
          label={discreetLabel(discreet, t("settings.theme"), t("discreet.theme"))}
          value={currentThemeLabel}
          onPress={cycleTheme}
        />
        <SettingsRow
          icon={<Languages size={20} color={colors.muted} />}
          label={t("settings.language")}
          value={currentLanguageLabel}
          onPress={cycleLanguage}
        />
      </View>

      <View className="mx-4 mt-4 mb-12 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader
          title={discreetLabel(
            discreet,
            t("settings.sectionAbout"),
            t("discreet.sectionAbout"),
          )}
        />
        <SettingsRow
          icon={<Info size={20} color={colors.muted} />}
          label={discreetLabel(
            discreet,
            t("settings.privacyPolicy"),
            t("discreet.privacyPolicy"),
          )}
          onPress={() => router.push("/settings/privacy")}
        />
        <SettingsRow
          icon={<Bug size={20} color={colors.muted} />}
          label={discreetLabel(
            discreet,
            t("settings.reportBug"),
            t("discreet.reportBug"),
          )}
          onPress={() =>
            reportBug().catch(() =>
              Alert.alert(t("settings.bugFailedTitle"), t("settings.bugFailedBody")),
            )
          }
        />
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center gap-3">
            <Info size={20} color={colors.muted} />
            <Text className="text-base text-[var(--text-primary)]">
              {discreetLabel(discreet, t("settings.version"), t("discreet.version"))}
            </Text>
          </View>
          <Text className="text-sm text-[var(--text-muted)]">0.1.0</Text>
        </View>
      </View>
    </ScrollView>
  )
}

function StatItem({
  value,
  label,
  discreet,
}: {
  value: string
  label: string
  discreet: boolean
}) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-2xl font-bold text-[var(--text-primary)]">{value}</Text>
      <Text className="text-xs text-[var(--text-muted)]">
        {discreetLabel(discreet, label, label.replace(/\w/g, "*"))}
      </Text>
    </View>
  )
}
