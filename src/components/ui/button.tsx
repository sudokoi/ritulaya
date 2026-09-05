import { Pressable, StyleSheet } from "react-native"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AppText } from "./text"

type ButtonVariant = "primary" | "muted" | "ghost" | "secondary" | "danger"
type ButtonSize = "sm" | "md"

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  onPress?: () => void
  disabled?: boolean
  pending?: boolean
  pendingLabel?: string
  accessibilityState?: { expanded?: boolean }
  accessibilityLabel?: string
  accessibilityRole?: "button"
  className?: string
  textClassName?: string
  children: ReactNode
  hitSlop?: number
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] active:opacity-60",
  muted: "bg-[var(--bg-muted)] active:opacity-60",
  ghost: "bg-transparent active:opacity-60",
  secondary: "border border-[var(--control-border)] bg-transparent active:opacity-60",
  danger: "bg-transparent active:opacity-60",
}

const variantTextClass: Record<ButtonVariant, string> = {
  primary: "text-[var(--on-accent)]",
  muted: "text-[var(--text-primary)]",
  ghost: "text-[var(--text-primary)]",
  secondary: "text-[var(--accent)]",
  danger: "text-[var(--danger)]",
}

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-4 py-2",
  md: "px-5 py-3",
}

export function Button({
  variant = "primary",
  size = "sm",
  onPress,
  disabled,
  pending = false,
  pendingLabel,
  accessibilityState,
  accessibilityLabel,
  accessibilityRole = "button",
  className,
  textClassName,
  children,
  hitSlop,
}: ButtonProps) {
  const content = pending && pendingLabel ? pendingLabel : children
  const isTextChild = typeof content === "string" || typeof content === "number"

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || pending}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        ...accessibilityState,
        disabled: !!disabled || pending,
        busy: pending,
      }}
      className={cn(
        "min-h-touch min-w-touch flex-row items-center justify-center rounded-button",
        variantClass[variant],
        sizeClass[size],
        disabled && !pending && "opacity-40",
        className,
      )}
    >
      {isTextChild ? (
        <AppText
          variant="label"
          style={styles.label}
          className={cn("shrink text-center", variantTextClass[variant], textClassName)}
        >
          {content}
        </AppText>
      ) : (
        content
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  label: { textAlignVertical: "center", includeFontPadding: false },
})
