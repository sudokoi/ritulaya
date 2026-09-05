import {
  View,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native"
import { useState, useCallback, useEffect, useRef } from "react"
import { format } from "date-fns"
import * as Haptics from "expo-haptics"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SYMPTOM_CATALOG, type SymptomKey } from "@/constants/symptoms"
import { MOOD_CATALOG, type MoodKey } from "@/constants/moods"
import { CERVICAL_MUCUS_CATALOG, type CervicalMucusKey } from "@/constants/cervical-mucus"
import type { FlowIntensity } from "@/types/day-log"
import type { DayEntryInput } from "@/domain/day-entry"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"
import { ChoiceChip } from "@/components/ui/choice-chip"
import { Field } from "@/components/ui/field"

const FLOW_LEVELS: FlowIntensity[] = ["none", "spotting", "light", "medium", "heavy"]

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
  onSave: (entry: DayEntryInput) => Promise<void>
  onClearPeriod?: () => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

function hasMeasurements(existing: DayDetailSheetProps["existing"]) {
  return (
    !!existing?.cervicalMucus || existing?.bbt != null || existing?.sexualActivity === 1
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
  const [sexualActivity, setSexualActivity] = useState<boolean | null>(
    existing?.sexualActivity == null ? null : existing.sexualActivity === 1,
  )
  const [moreTracking, setMoreTracking] = useState(hasMeasurements(existing))
  const [error, setError] = useState<"save" | "delete" | "update" | null>(null)
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const prevVisibleRef = useRef(visible)
  const pendingRef = useRef(false)
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | "update" | null>(
    null,
  )
  const pending = pendingAction !== null
  const scrollRef = useRef<ScrollView>(null)
  const contentRef = useRef<View>(null)
  const viewportHeightRef = useRef(0)
  const notesRef = useRef<TextInput>(null)
  const bbtRef = useRef<TextInput>(null)
  const focusedInputRef = useRef<TextInput | null>(null)

  const revealFocusedInput = useCallback(() => {
    const input = focusedInputRef.current
    const content = contentRef.current
    if (input?.isFocused() && content && viewportHeightRef.current > 0) {
      // The stock scroll-to-keyboard helper assumes a full-screen ScrollView.
      // Measure against our content and use the actual viewport below the header.
      input.measureLayout(content, (_x, top, _width, height) => {
        if (input.isFocused()) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, top + height + 16 - viewportHeightRef.current),
            animated: false,
          })
        }
      })
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const subscription = Keyboard.addListener("keyboardDidShow", revealFocusedInput)
    return () => subscription.remove()
  }, [visible, revealFocusedInput])

  useEffect(() => {
    const wasVisible = prevVisibleRef.current
    prevVisibleRef.current = visible
    if (!visible || wasVisible) return
    setFlow(existing?.flowIntensity ?? null)
    setSymptoms(existing?.symptoms ?? [])
    setMood(existing?.mood ?? null)
    setNotes(existing?.notes ?? "")
    setCervicalMucus((existing?.cervicalMucus as CervicalMucusKey) ?? null)
    setBbt(existing?.bbt != null ? String(existing.bbt) : "")
    setSexualActivity(
      existing?.sexualActivity == null ? null : existing.sexualActivity === 1,
    )
    setMoreTracking(hasMeasurements(existing))
    setError(null)
  }, [visible, existing])

  const toggleSymptom = useCallback((key: SymptomKey) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    )
  }, [])

  const close = () => {
    if (!pendingRef.current) onClose()
  }

  const mutate = async (
    action: () => Promise<void>,
    kind: "save" | "delete" | "update",
  ) => {
    if (pendingRef.current) return
    pendingRef.current = true
    setPendingAction(kind)
    setError(null)
    try {
      await action()
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onClose()
    } catch {
      setError(kind)
      focusedInputRef.current = null
      Keyboard.dismiss()
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const handleSave = () => {
    const bbtValue = bbt.trim() === "" ? null : Number.parseFloat(bbt)
    void mutate(
      () =>
        onSave({
          date: format(date, "yyyy-MM-dd"),
          flowIntensity: flow,
          symptoms,
          mood,
          notes: notes.trim() || null,
          cervicalMucus,
          bbt: bbtValue != null && !Number.isNaN(bbtValue) ? bbtValue : null,
          sexualActivity,
        }),
      "save",
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      {/* Resize the sheet's available height rather than padding its scrolling content. */}
      <KeyboardAvoidingView behavior="height" style={styles.keyboardContainer}>
        <Pressable className="absolute inset-0" onPress={close} accessible={false} />
        <View className="max-h-[90%] rounded-t-sheet bg-[var(--bg-primary)]">
          <View className="flex-row flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-screen py-4">
            <AppText variant="section" accessibilityRole="header">
              {format(date, "EEE, MMM d")}
            </AppText>
            <View className="flex-row flex-wrap gap-2">
              <Button
                size="sm"
                onPress={handleSave}
                disabled={pending}
                pending={pendingAction === "save"}
                pendingLabel={t("common.saving")}
                accessibilityLabel={t("sheet.saveEntry")}
              >
                {t("common.save")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onPress={close}
                disabled={pending}
                accessibilityLabel={t("common.close")}
              >
                {t("common.close")}
              </Button>
            </View>
          </View>
          <ScrollView
            ref={scrollRef}
            className="shrink"
            keyboardShouldPersistTaps="handled"
            onLayout={(event) => {
              viewportHeightRef.current = event.nativeEvent.layout.height
              revealFocusedInput()
            }}
            contentContainerStyle={{ paddingBottom: (insets.bottom ?? 0) + 24 }}
          >
            <View
              ref={contentRef}
              collapsable={false}
              className="gap-section px-screen py-section"
            >
              {error ? (
                <View
                  accessible
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  className="gap-2 border-l-2 border-[var(--danger)] pl-3"
                >
                  <AppText variant="label" tone="danger">
                    {t(`calendar.${error}FailedTitle`)}
                  </AppText>
                  <AppText variant="supporting">
                    {t(`calendar.${error}FailedBody`)}
                  </AppText>
                </View>
              ) : null}
              <View className="gap-3">
                <AppText variant="label">{t("sheet.flow")}</AppText>
                <View className="flex-row flex-wrap gap-2">
                  {FLOW_LEVELS.map((level) => (
                    <ChoiceChip
                      key={level}
                      label={t(`flow.${level}`)}
                      accessibilityLabel={t("sheet.flowState", {
                        label: t(`flow.${level}`),
                      })}
                      selected={flow === level}
                      disabled={pending}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        setFlow(flow === level ? null : level)
                      }}
                    />
                  ))}
                </View>
              </View>
              <View className="gap-3">
                <AppText variant="label">{t("sheet.mood")}</AppText>
                <View className="flex-row flex-wrap gap-2">
                  {MOOD_CATALOG.map((item) => (
                    <ChoiceChip
                      key={item.key}
                      label={`${item.emoji} ${t(`moods.${item.key}`)}`}
                      accessibilityLabel={t("sheet.moodState", {
                        label: t(`moods.${item.key}`),
                      })}
                      selected={mood === item.key}
                      disabled={pending}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        setMood(mood === item.key ? null : item.key)
                      }}
                    />
                  ))}
                </View>
              </View>
              <View className="gap-3">
                <AppText variant="label">{t("sheet.symptoms")}</AppText>
                <View className="flex-row flex-wrap gap-2">
                  {SYMPTOM_CATALOG.map((item) => (
                    <ChoiceChip
                      key={item.key}
                      label={t(`symptoms.${item.key}`)}
                      selected={symptoms.includes(item.key)}
                      disabled={pending}
                      onPress={() => toggleSymptom(item.key)}
                    />
                  ))}
                </View>
              </View>
              <Field
                label={t("sheet.notes")}
                ref={notesRef}
                onFocus={() => {
                  focusedInputRef.current = notesRef.current
                  revealFocusedInput()
                }}
                onContentSizeChange={revealFocusedInput}
                value={notes}
                editable={!pending}
                onChangeText={setNotes}
                placeholder={t("sheet.notesPlaceholder")}
                multiline
                submitBehavior="newline"
                className="min-h-32 max-h-48"
                style={styles.notes}
              />
              <View className="border-y border-[var(--border)] py-2">
                <Button
                  variant="ghost"
                  onPress={() => setMoreTracking((value) => !value)}
                  disabled={pending}
                  accessibilityState={{ expanded: moreTracking }}
                >
                  {t(moreTracking ? "sheet.lessTracking" : "sheet.moreTracking")}
                </Button>
                {moreTracking ? (
                  <View className="gap-section py-4">
                    <View className="gap-3">
                      <AppText variant="label">{t("sheet.cervicalMucus")}</AppText>
                      <View className="flex-row flex-wrap gap-2">
                        {CERVICAL_MUCUS_CATALOG.map((item) => (
                          <ChoiceChip
                            key={item.key}
                            label={t(`mucus.${item.key}`)}
                            accessibilityLabel={t("sheet.mucusState", {
                              label: t(`mucus.${item.key}`),
                            })}
                            selected={cervicalMucus === item.key}
                            disabled={pending}
                            onPress={() => {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                              setCervicalMucus(
                                cervicalMucus === item.key ? null : item.key,
                              )
                            }}
                          />
                        ))}
                      </View>
                    </View>
                    <Field
                      label={t("sheet.bbtLabel")}
                      accessibilityLabel={t("sheet.bbtA11y")}
                      ref={bbtRef}
                      onFocus={() => {
                        focusedInputRef.current = bbtRef.current
                        revealFocusedInput()
                      }}
                      value={bbt}
                      editable={!pending}
                      onChangeText={setBbt}
                      placeholder="36.6"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                    <View className="gap-3">
                      <AppText variant="label">{t("sheet.sexualActivity")}</AppText>
                      <View className="flex-row flex-wrap gap-2">
                        {[true, false].map((value) => (
                          <ChoiceChip
                            key={String(value)}
                            label={t(value ? "common.yes" : "common.no")}
                            accessibilityLabel={`${t("sheet.sexualActivity")}: ${t(value ? "common.yes" : "common.no")}`}
                            selected={sexualActivity === value}
                            disabled={pending}
                            onPress={() => {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                              setSexualActivity(value)
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
              {onClearPeriod &&
              existing?.flowIntensity &&
              existing.flowIntensity !== "none" ? (
                <Button
                  variant="danger"
                  disabled={pending}
                  pending={pendingAction === "update"}
                  onPress={() => void mutate(onClearPeriod, "update")}
                  accessibilityLabel={t("sheet.removePeriod")}
                >
                  {t("sheet.removePeriod")}
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  variant="danger"
                  disabled={pending}
                  pending={pendingAction === "delete"}
                  onPress={() => void mutate(onDelete, "delete")}
                  accessibilityLabel={t("sheet.deleteEntry")}
                >
                  {t("sheet.deleteEntry")}
                </Button>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // Keep this as a native style: KAV must override flex when it sets its height.
  keyboardContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  notes: { textAlignVertical: "top" },
})
