import {
  View,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  type AccessibilityState,
} from "react-native"
import { useRef, useState } from "react"
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
} from "lucide-react-native"
import { AppText } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { ChoiceChip } from "@/components/ui/choice-chip"
import { discreetLabel } from "@/lib/discreet"
import { useTranslation } from "react-i18next"
import { SUPPORTED_LOCALES, type LanguageSetting } from "@/i18n"
import { useSettings } from "@/hooks/use-settings"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { usePrediction } from "@/hooks/use-predictions"
import { useSync } from "@/hooks/use-sync"
import { exportData } from "@/services/export"
import { reportBug } from "@/services/bug-report"
import { requestNotificationPermissions } from "@/services/notifications"
import type { SettingsUpdate } from "@/stores/settings-store"
import Constants from "expo-constants"

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
  disabled?: boolean
  accessibilityRole?: "button" | "switch"
  accessibilityState?: AccessibilityState
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  right,
  disabled,
  accessibilityRole = "button",
  accessibilityState,
}: SettingsRowProps) {
  const { muted } = useThemeColors()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      className="min-h-touch flex-row items-center gap-3 border-b border-[var(--border)] py-4 active:opacity-60 disabled:opacity-40"
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        {icon}
      </View>
      <View className="flex-1 gap-1">
        <AppText variant="label">{label}</AppText>
        {value ? (
          <AppText variant="supporting" tone="muted">
            {value}
          </AppText>
        ) : null}
      </View>
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {right ?? (onPress ? <ChevronRight size={18} color={muted} /> : null)}
      </View>
    </Pressable>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <AppText variant="section" accessibilityRole="header" className="pt-5 pb-2">
      {title}
    </AppText>
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
    update: persistSettings,
  } = useSettings()
  const { periodLength, avgCycleLength } = usePrediction()
  const sync = useSync()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [expanded, setExpanded] = useState<"theme" | "language" | "reminder" | null>(null)
  const toggleOptions = (section: NonNullable<typeof expanded>) =>
    setExpanded((current) => (current === section ? null : section))

  const update = async (patch: SettingsUpdate) => {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    try {
      if (patch.biometricLock) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync()
        const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync())
        if (!enrolled) {
          Alert.alert(
            t("settings.biometricsUnavailableTitle"),
            t("settings.biometricsUnavailableBody"),
          )
          return
        }
      }
      if (
        (patch.reminderDailyLog || (patch.reminderPeriodAhead ?? 0) > 0) &&
        !(await requestNotificationPermissions())
      ) {
        Alert.alert(t("settings.permissionTitle"), t("settings.permissionBody"))
        return
      }
      await persistSettings(patch)
    } catch {
      Alert.alert(t("settings.saveFailedTitle"), t("settings.saveFailedBody"))
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const currentThemeOption = THEME_OPTIONS.find((option) => option.value === theme)
  const currentThemeLabel = currentThemeOption
    ? t(currentThemeOption.labelKey)
    : undefined

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

  const version = Constants.expoConfig?.version ?? Constants.nativeAppVersion

  return (
    <View className="flex-1 bg-[var(--bg-primary)]" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-screen pt-5 pb-section">
          <AppText variant="screen" accessibilityRole="header">
            {discreetLabel(discreet, t("settings.title"), t("discreet.settingsTitle"))}
          </AppText>
        </View>

        <View className="mx-screen mb-5 gap-3 rounded-card bg-[var(--bg-surface)] p-screen">
          {discreet ? (
            <AppText variant="supporting" tone="muted">
              {t("today.detailsHidden")}
            </AppText>
          ) : (
            <View className="flex-row flex-wrap gap-5">
              <StatItem value={`${avgCycleLength}`} label={t("calendar.avgCycle")} />
              <StatItem value={`${periodLength}`} label={t("calendar.periodDays")} />
            </View>
          )}
          <Button
            variant="secondary"
            onPress={() =>
              router.push({ pathname: "/seed", params: { mode: "settings" } })
            }
          >
            {t("settings.adjustCycle")}
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.push("/settings/insights")}
            textClassName="text-[var(--accent)]"
          >
            {discreetLabel(
              discreet,
              t("settings.viewInsights"),
              t("discreet.viewInsights"),
            )}
          </Button>
        </View>

        <View className="mx-screen rounded-card bg-[var(--bg-surface)] px-screen pb-2">
          <SectionHeader
            title={discreetLabel(
              discreet,
              t("settings.sectionPrivacy"),
              t("discreet.sectionPrivacy"),
            )}
          />
          <SettingsRow
            icon={<Shield size={20} color={colors.muted} />}
            accessibilityRole="switch"
            accessibilityState={{ checked: biometricLock }}
            disabled={pending}
            onPress={() => void update({ biometricLock: !biometricLock })}
            label={discreetLabel(
              discreet,
              t("settings.biometricLock"),
              t("discreet.biometricLock"),
            )}
            right={<Switch value={biometricLock} trackColor={{ true: colors.accent }} />}
          />
          <SettingsRow
            icon={<EyeOff size={20} color={colors.muted} />}
            accessibilityRole="switch"
            accessibilityState={{ checked: discreet }}
            disabled={pending}
            onPress={() => void update({ discreetMode: !discreet })}
            label={discreetLabel(
              discreet,
              t("settings.discreetMode"),
              t("discreet.discreetMode"),
            )}
            right={<Switch value={discreet} trackColor={{ true: colors.accent }} />}
          />
        </View>

        <View className="mx-screen mt-5 rounded-card bg-[var(--bg-surface)] px-screen pb-2">
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

        <View className="mx-screen mt-5 rounded-card bg-[var(--bg-surface)] px-screen pb-2">
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
            onPress={() => toggleOptions("reminder")}
            accessibilityState={{ expanded: expanded === "reminder" }}
          />
          {expanded === "reminder" ? (
            <View className="flex-row flex-wrap gap-2 py-3">
              {PERIOD_AHEAD_OPTIONS.map((days) => (
                <ChoiceChip
                  key={days}
                  label={days > 0 ? t("common.days", { count: days }) : t("common.off")}
                  selected={reminderPeriodAhead === days}
                  disabled={pending}
                  onPress={() => void update({ reminderPeriodAhead: days })}
                />
              ))}
            </View>
          ) : null}
          <SettingsRow
            icon={<Bell size={20} color={colors.muted} />}
            label={discreetLabel(
              discreet,
              t("settings.dailyLog"),
              t("discreet.dailyLog"),
            )}
            accessibilityRole="switch"
            accessibilityState={{ checked: reminderDailyLog }}
            disabled={pending}
            onPress={() => void update({ reminderDailyLog: !reminderDailyLog })}
            right={
              <Switch value={reminderDailyLog} trackColor={{ true: colors.accent }} />
            }
          />
        </View>

        <View className="mx-screen mt-5 rounded-card bg-[var(--bg-surface)] px-screen pb-2">
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
            onPress={() => toggleOptions("theme")}
            accessibilityState={{ expanded: expanded === "theme" }}
          />
          {expanded === "theme" ? (
            <View className="flex-row flex-wrap gap-2 py-3">
              {THEME_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option.value}
                  label={t(option.labelKey)}
                  selected={theme === option.value}
                  disabled={pending}
                  onPress={() => void update({ theme: option.value })}
                />
              ))}
            </View>
          ) : null}
          <SettingsRow
            icon={<Languages size={20} color={colors.muted} />}
            label={t("settings.language")}
            value={currentLanguageLabel}
            onPress={() => toggleOptions("language")}
            accessibilityState={{ expanded: expanded === "language" }}
          />
          {expanded === "language" ? (
            <View className="flex-row flex-wrap gap-2 py-3">
              {LANGUAGE_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option}
                  label={languageLabels[option]}
                  selected={resolveLanguageSetting(language) === option}
                  disabled={pending}
                  onPress={() => void update({ language: option })}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View className="mx-screen mt-5 rounded-card bg-[var(--bg-surface)] px-screen pb-2">
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
          <View className="flex-row flex-wrap items-center gap-3 py-4">
            <Info size={20} color={colors.muted} />
            <AppText variant="label" className="shrink">
              {discreetLabel(discreet, t("settings.version"), t("discreet.version"))}
            </AppText>
            {version ? (
              <AppText variant="supporting" tone="muted">
                {version}
              </AppText>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <AppText variant="date" className="text-center">
        {value}
      </AppText>
      <AppText variant="supporting" tone="muted" className="text-center">
        {label}
      </AppText>
    </View>
  )
}
