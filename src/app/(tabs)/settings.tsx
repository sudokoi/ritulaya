import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native"
import { router } from "expo-router"
import {
  Shield,
  EyeOff,
  Download,
  Bell,
  Smartphone,
  ChevronRight,
  Cloud,
  Info,
  Bug,
  BarChart3,
} from "lucide-react-native"
import { cn } from "@/lib/utils"
import { discreetLabel } from "@/lib/discreet"
import { MenuView } from "@expo/ui/community/menu"
import { useSettings } from "@/hooks/use-settings"
import { usePrediction } from "@/hooks/use-predictions"
import { exportData } from "@/services/export"
import { reportBug } from "@/services/bug-report"
import { useEffect } from "react"

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const
const PERIOD_AHEAD_OPTIONS = [0, 1, 2, 3, 5, 7]

type Theme = (typeof THEME_OPTIONS)[number]["value"]

interface SettingsRowProps {
  icon: React.ReactNode
  label: string
  value?: string
  onPress?: () => void
  right?: React.ReactNode
  danger?: boolean
}

function SettingsRow({ icon, label, value, onPress, right, danger }: SettingsRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !right}
      className="flex-row items-center justify-between border-b border-[var(--border-light)] py-4"
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
        {value && <Text className="text-sm text-[var(--text-muted)]">{value}</Text>}
        {right ?? (onPress ? <ChevronRight size={18} color="#8E8C8A" /> : null)}
      </View>
    </TouchableOpacity>
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
  const {
    biometricLock,
    discreetMode: discreet,
    theme,
    reminderPeriodAhead,
    reminderDailyLog,
    update,
    load,
  } = useSettings()
  const { periodLength, avgCycleLength } = usePrediction()

  useEffect(() => {
    load()
  }, [load])

  const selectTheme = (value: Theme) => update({ theme: value })

  const themeActions = THEME_OPTIONS.map((option) => ({
    id: option.value,
    title: option.label,
    state: (theme === option.value ? "on" : "off") as "on" | "off",
  }))

  const currentThemeLabel = THEME_OPTIONS.find((option) => option.value === theme)?.label

  const cyclePeriodAhead = () => {
    const idx = PERIOD_AHEAD_OPTIONS.indexOf(reminderPeriodAhead)
    const next = PERIOD_AHEAD_OPTIONS[(idx + 1) % PERIOD_AHEAD_OPTIONS.length]
    update({ reminderPeriodAhead: next })
  }

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="px-6 pt-14 pb-2">
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, "Settings", "Preferences")}
        </Text>
      </View>

      <View className="mx-4 mb-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <View className="flex-row justify-between">
          <StatItem value={`${avgCycleLength}`} label="avg cycle" discreet={discreet} />
          <StatItem value={`${periodLength}`} label="period days" discreet={discreet} />
        </View>
        <TouchableOpacity
          onPress={() => router.push("/settings/insights")}
          className="mt-3 flex-row items-center justify-center gap-1"
        >
          <BarChart3 size={14} color="#7BA891" />
          <Text className="text-sm font-medium text-follicular">
            {discreetLabel(discreet, "View Full Insights", "View Details")}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mx-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title={discreetLabel(discreet, "Privacy", "Security")} />
        <SettingsRow
          icon={<Shield size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Biometric Lock", "App Lock")}
          right={
            <Switch
              value={biometricLock}
              onValueChange={(v) => update({ biometricLock: v })}
              trackColor={{ true: "#7BA891" }}
            />
          }
        />
        <SettingsRow
          icon={<EyeOff size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Discreet Mode", "Simple Mode")}
          right={
            <Switch
              value={discreet}
              onValueChange={(v) => update({ discreetMode: v })}
              trackColor={{ true: "#7BA891" }}
            />
          }
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title={discreetLabel(discreet, "Data", "Storage")} />
        <SettingsRow
          icon={<Cloud size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "GitHub Sync", "Backup Sync")}
          value={discreetLabel(discreet, "Not set up", "Off")}
          onPress={() => router.push("/settings/github-sync")}
        />
        <SettingsRow
          icon={<Download size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Export Data", "Export")}
          onPress={() => void exportData()}
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title={discreetLabel(discreet, "Reminders", "Alerts")} />
        <SettingsRow
          icon={<Bell size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Period Ahead", "Alert Ahead")}
          value={reminderPeriodAhead > 0 ? `${reminderPeriodAhead} days` : "Off"}
          onPress={cyclePeriodAhead}
        />
        <SettingsRow
          icon={<Bell size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Daily Log", "Daily Alert")}
          right={
            <Switch
              value={reminderDailyLog}
              onValueChange={(v) => update({ reminderDailyLog: v })}
              trackColor={{ true: "#7BA891" }}
            />
          }
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title={discreetLabel(discreet, "Appearance", "Display")} />
        <MenuView
          actions={themeActions}
          onPressAction={(e) => selectTheme(e.nativeEvent.event as Theme)}
        >
          <View className="flex-row items-center justify-between border-b border-[var(--border-light)] py-4">
            <View className="flex-row items-center gap-3">
              <Smartphone size={20} color="#8E8C8A" />
              <Text className="text-base text-[var(--text-primary)]">
                {discreetLabel(discreet, "Theme", "Appearance")}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-[var(--text-muted)]">{currentThemeLabel}</Text>
              <ChevronRight size={18} color="#8E8C8A" />
            </View>
          </View>
        </MenuView>
      </View>

      <View className="mx-4 mt-4 mb-12 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title={discreetLabel(discreet, "About", "Info")} />
        <SettingsRow
          icon={<Info size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Privacy Policy", "Policy")}
          onPress={() => router.push("/settings/privacy")}
        />
        <SettingsRow
          icon={<Bug size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Report Bug", "Diagnostics")}
          onPress={() => void reportBug()}
        />
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center gap-3">
            <Info size={20} color="#8E8C8A" />
            <Text className="text-base text-[var(--text-primary)]">
              {discreetLabel(discreet, "Version", "Build")}
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
