import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native"
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
  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View className="px-6 pt-14 pb-2">
        <Text className="text-2xl font-bold text-[var(--text-primary)]">Settings</Text>
      </View>

      <View className="mx-4 mb-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <View className="flex-row justify-between">
          <StatItem value="28" label="avg cycle" />
          <StatItem value="5" label="period days" />
          <StatItem value="85%" label="regular" />
        </View>
        <TouchableOpacity className="mt-3 flex-row items-center justify-center gap-1">
          <Text className="text-sm font-medium text-follicular">View Full Insights</Text>
          <ChevronRight size={14} color="#7BA891" />
        </TouchableOpacity>
      </View>

      <View className="mx-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title="Privacy" />
        <SettingsRow
          icon={<Shield size={20} color="#8E8C8A" />}
          label="Biometric Lock"
          right={<Switch value={false} trackColor={{ true: "#7BA891" }} />}
        />
        <SettingsRow
          icon={<EyeOff size={20} color="#8E8C8A" />}
          label="Discreet Mode"
          right={<Switch value={false} trackColor={{ true: "#7BA891" }} />}
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title="Data" />
        <SettingsRow
          icon={<Cloud size={20} color="#8E8C8A" />}
          label="GitHub Sync"
          value="Not set up"
        />
        <SettingsRow icon={<Download size={20} color="#8E8C8A" />} label="Export Data" />
        <SettingsRow
          icon={<Trash2 size={20} color="#EF4444" />}
          label="Delete All Data"
          danger
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title="Reminders" />
        <SettingsRow
          icon={<Bell size={20} color="#8E8C8A" />}
          label="Period Ahead"
          value="2 days"
        />
        <SettingsRow
          icon={<Bell size={20} color="#8E8C8A" />}
          label="Daily Log"
          value="Off"
        />
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title="Appearance" />
        <SettingsRow
          icon={<Smartphone size={20} color="#8E8C8A" />}
          label="Theme"
          value="System"
        />
      </View>

      <View className="mx-4 mt-4 mb-12 rounded-card bg-[var(--bg-surface)] px-5">
        <SectionHeader title="About" />
        <SettingsRow icon={<Info size={20} color="#8E8C8A" />} label="Privacy Policy" />
        <SettingsRow icon={<Bug size={20} color="#8E8C8A" />} label="Export Debug Logs" />
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center gap-3">
            <Info size={20} color="#8E8C8A" />
            <Text className="text-base text-[var(--text-primary)]">Version</Text>
          </View>
          <Text className="text-sm text-[var(--text-muted)]">0.1.0</Text>
        </View>
      </View>
    </ScrollView>
  )
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-2xl font-bold text-[var(--text-primary)]">{value}</Text>
      <Text className="text-xs text-[var(--text-muted)]">{label}</Text>
    </View>
  )
}
