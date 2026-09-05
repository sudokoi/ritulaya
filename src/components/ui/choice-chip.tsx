import { Pressable, View, StyleSheet } from "react-native"
import { Check } from "lucide-react-native"
import { AppText } from "./text"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { cn } from "@/lib/utils"

interface ChoiceChipProps {
  label: string
  accessibilityLabel?: string
  selected: boolean
  disabled?: boolean
  onPress: () => void
}

export function ChoiceChip({
  label,
  accessibilityLabel = label,
  selected,
  disabled,
  onPress,
}: ChoiceChipProps) {
  const { onAccent } = useThemeColors()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled: !!disabled }}
      className={cn(
        "min-h-touch min-w-touch max-w-full flex-row items-center justify-center gap-2 rounded-pill border px-3 py-2 active:opacity-60",
        selected
          ? "border-[var(--accent)] bg-[var(--accent)]"
          : "border-[var(--control-border)] bg-transparent",
      )}
    >
      <View
        className="w-4 items-center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {selected ? <Check size={16} color={onAccent} /> : null}
      </View>
      <AppText
        variant="supporting"
        tone={selected ? "onAccent" : "primary"}
        className="shrink text-center"
        style={styles.label}
      >
        {label}
      </AppText>
      {/* Equal side slots keep the text itself centered, not just icon + text. */}
      <View className="w-4" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  label: { textAlignVertical: "center", includeFontPadding: false },
})
