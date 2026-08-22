import { View, Text, ScrollView, Pressable, Alert } from "react-native"
import { useState } from "react"
import { router } from "expo-router"
import { format, subDays } from "date-fns"
import { ChevronLeft, Minus, Plus } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { useSettings } from "@/hooks/use-settings"
import { logPeriodOnDate } from "@/domain/day-entry"
import { discreetLabel } from "@/lib/discreet"
import { useTranslation } from "react-i18next"

function Stepper({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  suffix?: string
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const { muted } = useThemeColors()
  const { t } = useTranslation()
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-base text-[var(--text-primary)]">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="rounded-button bg-[var(--bg-muted)] p-2 active:opacity-60 disabled:opacity-40"
          accessibilityRole="button"
          accessibilityLabel={t("seed.decrease", { label })}
        >
          <Minus size={18} color={muted} />
        </Pressable>
        <Text className="w-16 text-center text-lg font-semibold text-[var(--text-primary)]">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="rounded-button bg-[var(--bg-muted)] p-2 active:opacity-60 disabled:opacity-40"
          accessibilityRole="button"
          accessibilityLabel={t("seed.increase", { label })}
        >
          <Plus size={18} color={muted} />
        </Pressable>
      </View>
    </View>
  )
}

/**
 * Seed cycle flow: plant a historical period plus typical lengths so
 * predictions work before real logging history exists. Reached from the
 * Today screen when no cycles exist, and from Settings for adjustments.
 */
export default function SeedCycleScreen() {
  const { t } = useTranslation()
  const {
    discreetMode: discreet,
    avgCycleLength,
    avgPeriodLength,
    update,
  } = useSettings()
  const { muted } = useThemeColors()
  const insets = useSafeAreaInsets()

  // Typical lengths start from the stored settings so the screen shows the
  // user's current configuration when reached from Settings, not defaults.
  const [daysAgo, setDaysAgo] = useState(0)
  const [cycleLength, setCycleLength] = useState(avgCycleLength)
  const [periodLength, setPeriodLength] = useState(avgPeriodLength)
  const [saving, setSaving] = useState(false)
  // The Stepper renders the numeric value itself, so the suffix is unit-only.
  const daysAgoLabel = daysAgo === 1 ? t("seed.daysAgo_one") : t("seed.daysAgo_other")

  const handleSave = async () => {
    setSaving(true)
    try {
      await update({
        avgCycleLength: cycleLength,
        avgPeriodLength: periodLength,
      })
      await logPeriodOnDate(
        format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
        "medium",
        periodLength,
      )
      router.back()
    } catch {
      Alert.alert("Save failed", "Something went wrong while setting up your cycle.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-[var(--bg-primary)]">
      <View
        className="flex-row items-center gap-2 px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="p-2 active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <ChevronLeft size={24} color={muted} />
        </Pressable>
        <Text className="text-2xl font-bold text-[var(--text-primary)]">
          {discreetLabel(discreet, t("seed.title"), t("discreet.seedTitle"))}
        </Text>
      </View>

      <View className="mx-4 mt-4 rounded-card bg-[var(--bg-surface)] px-5 py-4">
        <Stepper
          label={t("seed.lastPeriodStarted")}
          value={daysAgo}
          suffix={daysAgoLabel}
          min={0}
          max={90}
          onChange={setDaysAgo}
        />
        <Stepper
          label={t("seed.typicalCycleLength")}
          value={cycleLength}
          suffix={t("common.daysUnit")}
          min={15}
          max={60}
          onChange={setCycleLength}
        />
        <Stepper
          label={t("seed.typicalPeriodLength")}
          value={periodLength}
          suffix={t("common.daysUnit")}
          min={1}
          max={12}
          onChange={setPeriodLength}
        />
      </View>

      <Pressable
        onPress={() => void handleSave()}
        disabled={saving}
        className="mx-4 mt-6 rounded-card bg-accent px-6 py-4 active:opacity-60"
        accessibilityRole="button"
        accessibilityLabel={t("seed.title")}
      >
        <Text className="text-center text-lg font-semibold text-white">
          {t("common.save")}
        </Text>
      </Pressable>

      <Text className="mx-8 mt-4 text-center text-xs text-[var(--text-muted)] opacity-70">
        {t("seed.explainer")}
      </Text>

      <View className="h-8" />
    </ScrollView>
  )
}
