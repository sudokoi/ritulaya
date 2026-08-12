import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native"
import { router } from "expo-router"
import {
  Shield,
  EyeOff,
  Download,
  Trash2,
  Bell,
  Smartphone,
  ChevronRight,
  Cloud,
  Info,
  Bug,
} from "lucide-react-native"
import { cn } from "@/lib/utils"
import { useSettingsActor } from "@/hooks/use-settings-actor"
import { useCycleActor } from "@/hooks/use-cycle-actor"
import { useDiscreet, discreetLabel } from "@/providers/discreet-guard"
import { useMemo, useEffect } from "react"
import { differenceInDays } from "date-fns"

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
    discreetMode,
    reminderPeriodAhead,
    reminderDailyLog,
    update,
    load,
  } = useSettingsActor()
  const { cycles } = useCycleActor()
  const discreet = useDiscreet()

  const stats = useMemo(() => {
    const completedCycles = cycles.filter((c) => c.endDate !== null)
    let totalLength = 0
    completedCycles.forEach((c) => {
      totalLength += differenceInDays(new Date(c.endDate ?? c.startDate), c.startDate)
    })
    const avgLen =
      completedCycles.length > 0 ? Math.round(totalLength / completedCycles.length) : 28
    return { avgLen }
  }, [cycles])

  useEffect(() => {
    load()
  }, [load])

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="px-6 pt-14 pb-2">
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, "Settings", "Preferences")}
        </Text>
      </View>

      <View className="mx-4 mb-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <View className="flex-row justify-between">
          <StatItem value={`${stats.avgLen}`} label="avg cycle" discreet={discreet} />
          <StatItem value={`${5}`} label="period days" discreet={discreet} />
          <StatItem
            value={cycles.length > 2 ? "85%" : "--"}
            label="regular"
            discreet={discreet}
          />
        </View>
        <TouchableOpacity className="mt-3 flex-row items-center justify-center gap-1">
          <Text className="text-sm font-medium text-follicular">
            {discreetLabel(discreet, "View Full Insights", "View Details")}
          </Text>
          <ChevronRight size={14} color="#7BA891" />
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
              value={discreetMode}
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
        />
        <SettingsRow
          icon={<Trash2 size={20} color="#EF4444" />}
          label={discreetLabel(discreet, "Delete All Data", "Clear All")}
          danger
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title={discreetLabel(discreet, "Reminders", "Alerts")} />
        <SettingsRow
          icon={<Bell size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Period Ahead", "Alert Ahead")}
          value={`${reminderPeriodAhead} days`}
        />
        <SettingsRow
          icon={<Bell size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Daily Log", "Daily Alert")}
          value={reminderDailyLog ? "On" : "Off"}
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title={discreetLabel(discreet, "Appearance", "Display")} />
        <SettingsRow
          icon={<Smartphone size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Theme", "Appearance")}
          value="System"
        />
      </View>

      <View className="mx-4 mt-4 mb-12 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title={discreetLabel(discreet, "About", "Info")} />
        <SettingsRow
          icon={<Info size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Privacy Policy", "Policy")}
        />
        <SettingsRow
          icon={<Bug size={20} color="#8E8C8A" />}
          label={discreetLabel(discreet, "Export Debug Logs", "Diagnostics")}
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
