import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
} from "react-native"
import { useState, useCallback } from "react"
import { format } from "date-fns"
import { X, Trash2 } from "lucide-react-native"
import * as Haptics from "expo-haptics"
import { SYMPTOM_CATALOG } from "@/constants/symptoms"
import { MOOD_CATALOG } from "@/constants/moods"
import type { SymptomKey } from "@/constants/symptoms"
import type { MoodKey } from "@/constants/moods"
import type { FlowIntensity } from "@/types/day-log"
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
  existingFlow?: FlowIntensity | null
  existingSymptoms?: SymptomKey[]
  existingMood?: MoodKey | null
  existingNotes?: string | null
  onSave: (data: {
    flowIntensity: FlowIntensity | null
    symptoms: SymptomKey[]
    mood: MoodKey | null
    notes: string | null
  }) => void
  onClearPeriod?: () => void
  onDelete?: () => void
  onClose: () => void
}

export function DayDetailSheet({
  visible,
  date,
  existingFlow,
  existingSymptoms = [],
  existingMood,
  existingNotes,
  onSave,
  onClearPeriod,
  onDelete,
  onClose,
}: DayDetailSheetProps) {
  const [flow, setFlow] = useState<FlowIntensity | null>(existingFlow ?? null)
  const [symptoms, setSymptoms] = useState<SymptomKey[]>(existingSymptoms)
  const [mood, setMood] = useState<MoodKey | null>(existingMood ?? null)
  const [notes, setNotes] = useState(existingNotes ?? "")

  const toggleSymptom = useCallback((key: SymptomKey) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    )
  }, [])

  const handleSave = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onSave({
      flowIntensity: flow,
      symptoms,
      mood,
      notes: notes.trim() || null,
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
        <Pressable className="mt-auto rounded-t-3xl bg-[var(--bg-primary)] pb-8">
          <View className="flex-row items-center justify-between border-b border-[var(--border-light)] px-6 py-4">
            <Text className="text-lg font-semibold text-[var(--text-primary)]">
              {format(date, "EEE, MMM d")}
            </Text>
            <View className="flex-row gap-2">
              {onDelete && (
                <TouchableOpacity onPress={handleDelete} className="p-2">
                  <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSave}
                className="rounded-button bg-follicular px-5 py-2"
              >
                <Text className="font-medium text-white">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={20} color="#8E8C8A" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="max-h-[70vh]" showsVerticalScrollIndicator={false}>
            <View className="px-6 py-4">
              <Text className="mb-3 text-sm font-medium text-[var(--text-muted)] uppercase">
                Flow
              </Text>
              <View className="flex-row gap-2">
                {FLOW_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.key}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setFlow(flow === level.key ? null : level.key)
                    }}
                    className={cn(
                      "flex-1 rounded-button py-2.5",
                      flow === level.key ? "bg-menstrual" : "bg-[var(--border-light)]",
                    )}
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
                  </TouchableOpacity>
                ))}
              </View>
              {onClearPeriod && existingFlow && existingFlow !== "none" && (
                <TouchableOpacity onPress={handleClearPeriod} className="mt-3 self-start">
                  <Text className="text-sm font-medium text-red-500">Remove Period</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="px-6 py-4">
              <Text className="mb-3 text-sm font-medium text-[var(--text-muted)] uppercase">
                Mood
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {MOOD_CATALOG.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setMood(mood === m.key ? null : m.key)
                    }}
                    className={cn(
                      "items-center gap-1 rounded-xl px-3 py-2",
                      mood === m.key && "bg-luteal/20",
                    )}
                  >
                    <Text className="text-2xl">{m.emoji}</Text>
                    <Text className="text-xs text-[var(--text-muted)]">{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="px-6 py-4">
              <Text className="mb-3 text-sm font-medium text-[var(--text-muted)] uppercase">
                Symptoms
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SYMPTOM_CATALOG.map((symptom) => (
                  <TouchableOpacity
                    key={symptom.key}
                    onPress={() => toggleSymptom(symptom.key)}
                    className={cn(
                      "rounded-pill px-4 py-2",
                      symptoms.includes(symptom.key)
                        ? "bg-luteal"
                        : "bg-[var(--border-light)]",
                    )}
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
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="px-6 py-4">
              <Text className="mb-3 text-sm font-medium text-[var(--text-muted)] uppercase">
                Notes
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="How are you feeling today?"
                placeholderTextColor="#8E8C8A"
                multiline
                numberOfLines={3}
                className="min-h-[80px] rounded-card bg-[var(--bg-surface)] p-4 text-[var(--text-primary)]"
                style={{ textAlignVertical: "top" }}
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
