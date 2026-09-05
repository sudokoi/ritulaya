import { Pressable, type PressableProps } from "react-native"
import { cn } from "@/lib/utils"

interface IconButtonProps extends PressableProps {
  accessibilityLabel: string
}

export function IconButton({ className, accessibilityLabel, ...props }: IconButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "min-h-touch min-w-touch items-center justify-center rounded-button active:opacity-60 disabled:opacity-40",
        className,
      )}
    />
  )
}
