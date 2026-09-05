import { useState, type Ref } from "react"
import { TextInput, View, type TextInputProps } from "react-native"
import { AppText } from "./text"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { cn } from "@/lib/utils"

interface FieldProps extends TextInputProps {
  label: string
  ref?: Ref<TextInput>
}

export function Field({ label, ref, onFocus, onBlur, className, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false)
  const { muted } = useThemeColors()
  return (
    <View className="gap-3">
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={muted}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        className={cn(
          "min-h-touch rounded-button border bg-[var(--bg-surface)] p-3 text-body text-[var(--text-primary)]",
          focused ? "border-[var(--accent)]" : "border-[var(--control-border)]",
          className,
        )}
      />
    </View>
  )
}
