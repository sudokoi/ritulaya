import { Pressable, Text } from "react-native"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "muted" | "ghost"
type ButtonSize = "sm" | "md"

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  onPress?: () => void
  disabled?: boolean
  accessibilityLabel?: string
  accessibilityRole?: "button"
  className?: string
  textClassName?: string
  children: ReactNode
  hitSlop?: number
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-accent active:opacity-60",
  muted: "bg-[var(--bg-muted)] active:opacity-60",
  ghost: "bg-transparent active:opacity-60",
}

const variantTextClass: Record<ButtonVariant, string> = {
  primary: "text-white",
  muted: "text-[var(--text-primary)]",
  ghost: "text-[var(--text-primary)]",
}

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-5 py-2",
  md: "min-h-[44px] px-6 py-3",
}

export function Button({
  variant = "primary",
  size = "sm",
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityRole = "button",
  className,
  textClassName,
  children,
  hitSlop,
}: ButtonProps) {
  const isTextChild = typeof children === "string"

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "flex-row items-center justify-center rounded-button",
        variantClass[variant],
        sizeClass[size],
        disabled && "opacity-40",
        className,
      )}
      style={{ alignItems: "center", justifyContent: "center" }}
    >
      {isTextChild ? (
        <Text
          className={cn(
            "text-center text-sm font-medium leading-none",
            variantTextClass[variant],
            textClassName,
          )}
          style={{ textAlign: "center", textAlignVertical: "center" } as never}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
