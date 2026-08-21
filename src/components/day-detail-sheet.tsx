import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useState, useCallback } from "react"
import { format } from "date-fns"
import { X, Trash2 } from "lucide-react-native"
import * as Haptics from "expo-haptics"
import { SYMPTOM_CATALOG } from "@/constants/symptoms"
import { MOOD_CATALOG } from "@/constants/moods"
import { CERVICAL_MUCUS_CATALOG } from "@/constants/cervical-mucus"
import { useThemeColors } from "@/hooks/use-theme-colors"
import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"
import type { CervicalMucusKey } from "@/constants/cervical-mucus"
import type { FlowIntensity } from "@/types/day-log"
import type { DayEntryInput } from "@/domain/day-entry"
import { cn } from "@/lib/utils"

const FLOW_LEVELS: { key: FlowIntensity; label: string }[] = [
  { key: "none", label: "None" },
  { key: "spotting", label: "Spotting" },
  { key: "light", label: "Light" },
  { key: "medium", label: "Medium" },
  { key: "heavy", label: "Heavy" },
]

interface DayDetailSheetProps {
  visible: boolean
  date: Date
  existing?: {
    flowIntensity: FlowIntensity | null
    symptoms: SymptomKey[]
    mood: MoodKey | null
    notes: string | null
    cervicalMucus: string | null
    bbt: number | null
    sexualActivity: number
  } | null
  onSave: (entry: DayEntryInput) => void
  onClearPeriod?: () => void
  onDelete?: () => void
  onClose: () => void
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-3 text-sm font-medium text-[var(--text-muted)] uppercase">
      {children}
    </Text>
  )
}

export function DayDetailSheet({
  visible,
  date,
  existing = null,
  onSave,
  onClearPeriod,
  onDelete,
  onClose,
}: DayDetailSheetProps) {
  const [flow, setFlow] = useState<FlowIntensity | null>(existing?.flowIntensity ?? null)
  const [symptoms, setSymptoms] = useState<SymptomKey[]>(existing?.symptoms ?? [])
  const [mood, setMood] = useState<MoodKey | null>(existing?.mood ?? null)
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [cervicalMucus, setCervicalMucus] = useState<CervicalMucusKey | null>(
    (existing?.cervicalMucus as CervicalMucusKey) ?? null,
  )
  const [bbt, setBbt] = useState(existing?.bbt != null ? String(existing.bbt) : "")
  const [sexualActivity, setSexualActivity] = useState(existing?.sexualActivity === 1)
  const { muted, danger } = useThemeColors()

  const toggleSymptom = useCallback((key: SymptomKey) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    )
  }, [])

  const handleSave = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const bbtValue = bbt.trim() === "" ? null : Number.parseFloat(bbt)
    onSave({
      date: format(date, "yyyy-MM-dd"),
      flowIntensity: flow,
      symptoms,
      mood,
      notes: notes.trim() || null,
      cervicalMucus,
      bbt: bbtValue != null && !Number.isNaN(bbtValue) ? bbtValue : null,
      sexualActivity,
    })
    onClose()
  }

  const handleDelete = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onDelete?.()
    onClose()
  }

  const handleClearPeriod = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onClearPeriod?.()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable className="flex-1 bg-black/30" onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="mt-auto"
        >
          <Pressable className="rounded-t-3xl bg-[var(--bg-primary)] pb-8">
            <View className="flex-row items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <Text className="text-lg font-semibold text-[var(--text-primary)]">
                {format(date, "EEE, MMM d")}
              </Text>
              <View className="flex-row gap-2">
                {onDelete ? (
                  <Pressable
                    onPress={handleDelete}
                    className="p-3 active:opacity-60"
                    accessibilityRole="button"
                    accessibilityLabel="Delete entry"
                  >
                    <Trash2 size={20} color={danger} />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={handleSave}
                  className="rounded-button bg-accent px-5 py-2 active:opacity-60"
                  accessibilityRole="button"
                  accessibilityLabel="Save entry"
                >
                  <Text className="font-medium text-white">Save</Text>
                </Pressable>
                <Pressable
                  onPress={onClose}
                  className="p-3 active:opacity-60"
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={20} color={muted} />
                </Pressable>
              </View>
            </View>

            <ScrollView className="max-h-[70vh]" showsVerticalScrollIndicator={false}>
              <View className="px-6 py-4">
                <SectionLabel>Flow</SectionLabel>
                <View className="flex-row gap-2">
                  {FLOW_LEVELS.map((level) => (
                    <Pressable
                      key={level.key}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        setFlow(flow === level.key ? null : level.key)
                      }}
                      className={cn(
                        "flex-1 rounded-button py-2.5 active:opacity-60",
                        flow === level.key ? "bg-accent" : "bg-[var(--bg-muted)]",
                      )}
                      accessibilityRole="button"
                      accessibilityLabel={`Flow ${level.label}`}
                      accessibilityState={{ selected: flow === level.key }}
                    >
                      <Text
                        className={cn(
                          "text-center text-sm",
                          flow === level.key
                            ? "font-medium text-white"
                            : "text-[var(--text-primary)]",
                        )}
                      >
                        {level.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {onClearPeriod &&
                existing?.flowIntensity &&
                existing.flowIntensity !== "none" ? (
                  <Pressable
                    onPress={handleClearPeriod}
                    className="mt-3 self-start active:opacity-60"
                    accessibilityRole="button"
                    accessibilityLabel="Remove period"
                  >
                    <Text className="text-sm font-medium" style={{ color: danger }}>
                      Remove Period
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <View className="px-6 py-4">
                <SectionLabel>Mood</SectionLabel>
                <View className="flex-row flex-wrap gap-3">
                  {MOOD_CATALOG.map((m) => (
                    <Pressable
                      key={m.key}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        setMood(mood === m.key ? null : m.key)
                      }}
                      className={cn(
                        "items-center gap-1 rounded-xl px-3 py-2 active:opacity-60",
                        mood === m.key && "bg-accent/20",
                      )}
                      accessibilityRole="button"
                      accessibilityLabel={`Mood ${m.label}`}
                      accessibilityState={{ selected: mood === m.key }}
                    >
                      <Text className="text-2xl">{m.emoji}</Text>
                      <Text className="text-xs text-[var(--text-muted)]">{m.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="px-6 py-4">
                <SectionLabel>Symptoms</SectionLabel>
                <View className="flex-row flex-wrap gap-2">
                  {SYMPTOM_CATALOG.map((symptom) => (
                    <Pressable
                      key={symptom.key}
                      onPress={() => toggleSymptom(symptom.key)}
                      className={cn(
                        "rounded-pill px-4 py-2.5 active:opacity-60",
                        symptoms.includes(symptom.key)
                          ? "bg-accent"
                          : "bg-[var(--bg-muted)]",
                      )}
                      accessibilityRole="button"
                      accessibilityLabel={symptom.label}
                      accessibilityState={{ selected: symptoms.includes(symptom.key) }}
                    >
                      <Text
                        className={cn(
                          "text-sm",
                          symptoms.includes(symptom.key)
                            ? "font-medium text-white"
                            : "text-[var(--text-primary)]",
                        )}
                      >
                        {symptom.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="px-6 py-4">
                <SectionLabel>Cervical Mucus</SectionLabel>
                <View className="flex-row flex-wrap gap-2">
                  {CERVICAL_MUCUS_CATALOG.map((mucus) => (
                    <Pressable
                      key={mucus.key}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        setCervicalMucus(cervicalMucus === mucus.key ? null : mucus.key)
                      }}
                      className={cn(
                        "rounded-pill px-4 py-2.5 active:opacity-60",
                        cervicalMucus === mucus.key
                          ? "bg-accent"
                          : "bg-[var(--bg-muted)]",
                      )}
                      accessibilityRole="button"
                      accessibilityLabel={`Cervical mucus ${mucus.label}`}
                      accessibilityState={{ selected: cervicalMucus === mucus.key }}
                    >
                      <Text
                        className={cn(
                          "text-sm",
                          cervicalMucus === mucus.key
                            ? "font-medium text-white"
                            : "text-[var(--text-primary)]",
                        )}
                      >
                        {mucus.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="px-6 py-4">
                <SectionLabel>Body</SectionLabel>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base text-[var(--text-primary)]">
                    Basal body temperature (°C)
                  </Text>
                  <TextInput
                    value={bbt}
                    onChangeText={setBbt}
                    placeholder="36.6"
                    placeholderTextColor={muted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    className="w-24 rounded-button bg-[var(--bg-surface)] px-3 py-2 text-right text-[var(--text-primary)]"
                    accessibilityLabel="Basal body temperature in degrees Celsius"
                  />
                </View>
                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-base text-[var(--text-primary)]">
                    Sexual activity
                  </Text>
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setSexualActivity(!sexualActivity)
                    }}
                    className={cn(
                      "rounded-pill px-5 py-2 active:opacity-60",
                      sexualActivity ? "bg-accent" : "bg-[var(--bg-muted)]",
                    )}
                    accessibilityRole="button"
                    accessibilityLabel="Sexual activity"
                    accessibilityState={{ selected: sexualActivity }}
                  >
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        sexualActivity ? "text-white" : "text-[var(--text-primary)]",
                      )}
                    >
                      {sexualActivity ? "Yes" : "No"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View className="px-6 py-4">
                <SectionLabel>Notes</SectionLabel>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="How are you feeling today?"
                  placeholderTextColor={muted}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                  className="min-h-[80px] rounded-card bg-[var(--bg-surface)] p-4 text-[var(--text-primary)]"
                  style={{ textAlignVertical: "top" }}
                />
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}
